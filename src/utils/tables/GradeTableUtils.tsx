// React imports:
import React, { useState } from "react";

// Next imports
import fetch from "isomorphic-unfetch";

import _ from "lodash";

import styles from "../../components/GenericTable.module.css";

// Bootstrap imports:

import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

// Utils
import { CommonTableDefs } from "../../utils/tables/CommonTableDefs";
import { CbbColors } from "../../utils/CbbColors";
import { GradeUtils } from "../../utils/stats/GradeUtils";

// Component imports
import {
  GenericTableColProps,
  GenericTableOps,
  GenericTableRow,
} from "../../components/GenericTable";
import {
  DivisionStatistics,
  IndivStatSet,
  PureStatSet,
  Statistic,
  TeamStatSet,
} from "../../utils/StatModels";
import { DerivedStatsUtils } from "../stats/DerivedStatsUtils";
import { ParamDefaults, CommonFilterParams } from "../FilterModels";
import { DateUtils } from "../DateUtils";
import { GoodBadOkTriple } from "../stats/TeamEditorUtils";
import { truncate } from "fs/promises";
import { TeamEditorTableUtils } from "./TeamEditorTableUtils";
import { de } from "date-fns/locale";
// Font Awesome imports
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWindowClose } from "@fortawesome/free-regular-svg-icons";

export type StatsCaches = {
  comboTier?: DivisionStatistics;
  highTier?: DivisionStatistics;
  mediumTier?: DivisionStatistics;
  lowTier?: DivisionStatistics;
};

export type PositionStatsCache = Record<string, StatsCaches>;

type TeamProps = {
  isFullSelection?: boolean;
  selectionType: "on" | "off" | "baseline" | "other";
  config: string;
  setConfig: (newConfig: string) => void;
  teamStats: StatsCaches;

  team: TeamStatSet;
};

type CommonPlayerProps = {
  selectionTitle: string;
  config: string;
  setConfig: (newConfig: string) => void;
  playerStats: StatsCaches;
  playerPosStats: PositionStatsCache;
};

type PlayerProps = {
  [P in keyof CommonPlayerProps]: CommonPlayerProps[P];
} & {
  isFullSelection?: boolean;

  player: IndivStatSet;

  expandedView: boolean;
  possAsPct: boolean;
  factorMins: boolean;
  includeRapm: boolean;
  leaderboardMode?: boolean;
};

type ProjectedPlayerProps = {
  [P in keyof CommonPlayerProps]: CommonPlayerProps[P];
} & {
  isFullSelection?: boolean;

  code: string;
  playerProjections: PureStatSet;

  evalMode: boolean;
  offSeasonMode: boolean;
  factorMins: boolean;
  enableNil: boolean;
  caliberMode: boolean;
};

type TableBuilderInfo = {
  custom: Record<string, (val: any, valMeta: string) => string | undefined>;
  freq_pct: Set<string>;
  // all others are off_pct_qual
};

/** Builds the team and player grade tables based on their config */
const buildGradesTable = (
  table: Record<string, GenericTableColProps>,
  config: TableBuilderInfo,
  player: boolean,
  expandedView: boolean = false
) =>
  _.chain(table)
    .map((val, key) => {
      const formatter = player
        ? GenericTableOps.approxRankOrHtmlFormatter
        : GenericTableOps.gradeOrHtmlFormatter;
      if (key == "title") {
        return [
          key,
          !expandedView && player //(single row player)
            ? GenericTableOps.addTitle(
                "",
                "",
                GenericTableOps.defaultRowSpanCalculator,
                "",
                formatter
              )
            : GenericTableOps.addTitle(
                "",
                "",
                CommonTableDefs.rowSpanCalculator,
                "",
                formatter
              ),
        ];
      } else if (_.startsWith(key, "sep")) {
        return [key, val] as [string, GenericTableColProps];
      } else if (config.freq_pct.has(key)) {
        return [
          key,
          GenericTableOps.addDataCol(
            val.colName,
            "",
            CbbColors.varPicker(CbbColors.all_pctile_freq),
            formatter
          ),
        ];
      } else {
        // "falls back" to CbbColors.off_pctile_qual
        const picker = config.custom[key];
        if (!_.isNil(picker)) {
          return [
            key,
            GenericTableOps.addDataCol(val.colName, "", picker, formatter),
          ];
        } else {
          return [
            key,
            GenericTableOps.addDataCol(
              val.colName,
              "",
              CbbColors.varPicker(CbbColors.off_pctile_qual),
              formatter
            ),
          ];
        }
      }
    })
    .fromPairs()
    .value();

/** Controls the formatting of the team grade table */
const teamBuilderInfo = {
  custom: {
    net: CbbColors.offOnlyPicker(...CbbColors.pctile_qual),
  },
  freq_pct: new Set(["assist", "3pr", "2pmidr", "2primr"]),
};

/** Controls the formatting of the team and player grade tables */
const playerBuilderInfo = {
  custom: {
    // AST%
    "3pr": CbbColors.offOnlyPicker(...CbbColors.pctile_freq),
    "2pmidr": CbbColors.offOnlyPicker(...CbbColors.pctile_freq),
    "2primr": CbbColors.offOnlyPicker(...CbbColors.pctile_freq),
    // FT:
    "3p": CbbColors.offOnlyPicker(...CbbColors.pctile_qual),
  },
  freq_pct: new Set(["usage", "assist"]),
};

/** Controls the formatting of the projected player grade tables */
const projectedPlayerBuilderInfo = {
  custom: {},
  freq_pct: new Set(["usage"]),
};

export type DivisionStatsCache = {
  inFlight?: boolean;
  year?: string;
  gender?: string;
  Combo?: DivisionStatistics;
  High?: DivisionStatistics;
  Medium?: DivisionStatistics;
  Low?: DivisionStatistics;
};

export class GradeTableUtils {
  /** Picks out the set of stats to use based on tier */
  static readonly pickDivisonStats = (
    cache: Record<string, DivisionStatsCache>,
    year: string,
    gender: string,
    gradeConfig: string
  ): DivisionStatistics | undefined => {
    if (gender == "Women" || year < DateUtils.yearFromWhichAllMenD1Imported) {
      return cache[year]?.High;
    } else {
      const configStr = gradeConfig.split(":");
      const tierStrTmp = configStr?.[1] || "Combo";
      const cacheYear = cache[year];
      switch (tierStrTmp) {
        case "Combo":
          return cacheYear?.Combo;
        case "High":
          return cacheYear?.High;
        case "Medium":
          return cacheYear?.Medium;
        case "Low":
          return cacheYear?.Low;
        default:
          return undefined;
      }
    }
  };

  /** Are we showing grades in their own rows? (Utility encapsulating some of the show grades config format complexity) */
  static readonly showingStandaloneGrades = (
    showGrades: string | undefined
  ): boolean => {
    return Boolean(showGrades && showGrades.includes(":Row"));
  };

  /** Are we showing grades inline in "hybrid mode"? (Utility encapsulating some of the show grades config format complexity) */
  static readonly showingHybridOrStandaloneGrades = (showGrades: string) => {
    return !showGrades.includes(":Inline"); //(:Hybrid is default so can be represented by no entry)
  };

  /** Are we filtering by position? (Utility encapsulating some of the show grades config format complexity) */
  static readonly getPlayerGradesPosGroup = (showGrades: string) => {
    return showGrades.split(":")[2]; //(rank[:tier[:pos]])
  };

  /** Showing grades as ranks or %les? (Utility encapsulating some of the show grades config format complexity) */
  static readonly getGradeType = (showGrades: string): "rank" | "pct" => {
    return showGrades.startsWith("rank:") ? "rank" : "pct";
  };

  /** Create or build a cache contain D1/tier stats for a bunch of team statistics */
  static readonly populateTeamDivisionStatsCache = (
    filterParams: CommonFilterParams,
    setCache: (s: DivisionStatsCache) => void,
    tierOverride: string | undefined = undefined
  ) => {
    GradeTableUtils.populateDivisionStatsCache(
      "team",
      filterParams,
      setCache,
      tierOverride
    );
  };

  /** Create or build a cache contain D1/tier stats for a bunch of team statistics */
  static readonly populatePlayerDivisionStatsCache = (
    filterParams: CommonFilterParams,
    setCache: (s: DivisionStatsCache) => void,
    tierOverride: string | undefined = undefined,
    posOverride: string | undefined = undefined
  ) => {
    GradeTableUtils.populateDivisionStatsCache(
      "player",
      filterParams,
      setCache,
      tierOverride,
      posOverride
    );
  };

  /** Create or build a cache contain D1/tier stats for a bunch of team statistics */
  static readonly populateDivisionStatsCache = (
    type: "player" | "team",
    filterParams: CommonFilterParams,
    setCache: (s: DivisionStatsCache) => void,
    tierOverride: string | undefined = undefined,
    posOverride: string | undefined = undefined
  ) => {
    const urlInfix = type == "player" ? "players_" : "";
    const maybePosParam = posOverride ? `&posGroup=${posOverride}` : "";
    const maybePosInfix = posOverride ? `pos${posOverride}_` : "";
    const getUrl = (inGender: string, inYear: string, inTier: string) => {
      const subYear = inYear.substring(0, 4);

      const isPreseason =
        tierOverride == "Preseason" &&
        inYear > DateUtils.mostRecentYearWithData;
      //(during the current off-season, BUT NOT after the next season starts - get Preseason from dynamic storage)

      if (isPreseason || DateUtils.inSeasonYear.startsWith(subYear)) {
        // Access from dynamic storage
        return `/api/getStats?&gender=${inGender}&year=${subYear}&tier=${inTier}&type=${type}${maybePosParam}`;
      } else {
        //archived (+ preseason - this requires manual intervention anyway so might as well store locally)
        return `/leaderboards/lineups/stats_${urlInfix}${maybePosInfix}all_${inGender}_${subYear}_${inTier}.json`;
      }
    };

    const inGender = filterParams.gender || ParamDefaults.defaultGender;
    const inYear = filterParams.year || ParamDefaults.defaultYear;
    const fetchAll = (
      tierOverride ? [tierOverride] : ["Combo", "High", "Medium", "Low"]
    ).map((tier) => {
      return fetch(getUrl(inGender, inYear, tier)).then(
        (response: fetch.IsomorphicResponse) => {
          return response.ok ? response.json() : Promise.resolve({});
        }
      );
    });
    Promise.all(fetchAll)
      .then((jsons: any[]) => {
        setCache({
          year: inYear,
          gender: inGender, //(so know when to refresh cache)
          Combo: _.isEmpty(jsons[0]) ? undefined : jsons[0], //(if using tierOverride, it goes in here)
          High: _.isEmpty(jsons[1]) ? undefined : jsons[1],
          Medium: _.isEmpty(jsons[2]) ? undefined : jsons[2],
          Low: _.isEmpty(jsons[3]) ? undefined : jsons[3],
        });
      })
      .catch((err: any) => {
        //(ensure we empty the cache rather than leave it stale)
        setCache({});
      });
  };

  /** Builds a grade controller element */
  static readonly buildTeamGradeControlState: (
    title: string,
    p: TeamProps,
    globalSettings?: {
      countsAreExample: boolean;
      onHide: () => void;
    }
  ) => any = (
    title,
    {
      selectionType,
      config,
      setConfig,
      teamStats: { comboTier, highTier, mediumTier, lowTier },
    },
    globalSettings
  ) => {
    const nameAsId = selectionType.replace(/[^A-Za-z0-9_]/g, "");
    const tiers = {
      //(handy LUT)
      High: highTier,
      Medium: mediumTier,
      Low: lowTier,
      Combo: comboTier,
    } as Record<string, DivisionStatistics | undefined>;

    // (Unused because the OverlayTrigger doesn't work, see below)
    // const tooltipMap = {
    //   Combo: (
    //     <Tooltip id={`comboTooltip${nameAsId}`}>
    //       Compare each stat against the set of all available D1 teams
    //     </Tooltip>
    //   ),
    //   High: (
    //     <Tooltip id={`highTooltip${nameAsId}`}>
    //       Compare each stat against the "high tier" of D1 (high majors,
    //       mid-high majors, any team in the T150)
    //     </Tooltip>
    //   ),
    //   Medium: (
    //     <Tooltip id={`mediumTooltip${nameAsId}`}>
    //       Compare each stat against the "medium tier" of D1
    //       (mid/mid-high/mid-low majors, if in the T275)
    //     </Tooltip>
    //   ),
    //   Low: (
    //     <Tooltip id={`lowTooltip${nameAsId}`}>
    //       Compare each stat against the "low tier" of D1 (low/mid-low majors,
    //       if outside the T250)
    //     </Tooltip>
    //   ),
    // } as Record<string, any>;

    const configStr = (config || ParamDefaults.defaultEnabledGrade).split(":");
    const gradeFormat = configStr[0];
    const tierStrTmp = configStr?.[1] || "Combo";
    const tierStr = tiers[tierStrTmp]
      ? tierStrTmp
      : tiers["Combo"]
      ? "Combo"
      : tiers["High"]
      ? "High"
      : tierStrTmp;
    //(defaults to hybrid)
    const gradeView = configStr?.[2] || "Hybrid"; //Hybrid / Standalone / Inline

    const configParams = (
      newGradeFormat: string,
      newTier: string,
      newGradeView: string
    ) => {
      return [`${newGradeFormat}:${newTier}`]
        .concat(newGradeView == "Hybrid" ? [] : [`:${newGradeView}`])
        .join("");
    };
    const tierLinkTmp = (newTier: string) => (
      <a
        href={config == "" || tiers[newTier] ? "#" : undefined}
        onClick={(event) => {
          event.preventDefault();
          setConfig(configParams(gradeFormat, newTier, gradeView));
        }}
      >
        {newTier == "Combo" ? "D1" : newTier.substring(0, 1)}
        {tiers[newTier] ? ` (${tiers[newTier]?.tier_sample_size})` : ""}
      </a>
    );
    const tierLink = (tier: string) =>
      tier == tierStr ? <b>{tierLinkTmp(tier)}</b> : tierLinkTmp(tier);
    //TODO: I think the event.preventDefault stops the OverlayTrigger from working (on mobile specifically), so removing it for now
    //      <OverlayTrigger placement="auto" overlay={tooltipMap[tier]!}>
    //         {(tier == tierStr) ? <b>{linkTmp(tier)}</b> : linkTmp(tier)}
    //      </OverlayTrigger>;

    const topLine = (
      <span className="small">
        {tierLink("Combo")} | {tierLink("High")} | {tierLink("Medium")} |{" "}
        {tierLink("Low")}
      </span>
    );

    // (Unused because the OverlayTrigger doesn't work, see below)
    // const eqRankShowTooltip = (
    //   <Tooltip id={`eqRankShowTooltip${nameAsId}`}>
    //     Show the approximate rank for each stat against the "tier"
    //     (D1/High/etc) as if it were over the entire season
    //   </Tooltip>
    // );
    // const percentileShowTooltip = (
    //   <Tooltip id={`percentileShowTooltip${nameAsId}`}>
    //     Show the percentile of each stat against the "tier" (D1/High/etc){" "}
    //   </Tooltip>
    // );

    //TODO: I think the event.preventDefault stops the OverlayTrigger from working (on mobile specifically), so removing it for now
    const maybeBold = (bold: boolean, html: React.ReactNode) =>
      bold ? <b>{html}</b> : html;
    const bottomLine = (
      <span className="small">
        {maybeBold(
          gradeFormat == "rank",
          //            <OverlayTrigger placement="auto" overlay={eqRankShowTooltip}>
          <a
            href={"#"}
            onClick={(event) => {
              event.preventDefault();
              setConfig(configParams("rank", tierStrTmp, gradeView));
            }}
          >
            Ranks
          </a>
          //            </OverlayTrigger>
        )}
        &nbsp;|{" "}
        {maybeBold(
          gradeFormat == "pct",
          //           <OverlayTrigger placement="auto" overlay={percentileShowTooltip}>
          <a
            href="#"
            onClick={(event) => {
              event.preventDefault();
              setConfig(configParams("pct", tierStrTmp, gradeView));
            }}
          >
            %iles
          </a>
          //           </OverlayTrigger>
        )}
      </span>
    );

    const helpTierTooltip = (
      <Tooltip id={`helpTooltip${nameAsId}`}>
        High Tier: high majors, mid-high majors, plus any team in the T150
        <br />
        Medium Tier: mid/mid-high/mid-low majors, if in the T275
        <br />
        Low Tier: low/mid-low majors, or if outside the T250
      </Tooltip>
    );
    const helpTierOverlay = (
      <OverlayTrigger placement="auto" overlay={helpTierTooltip}>
        <b>(?)</b>
      </OverlayTrigger>
    );

    const viewGroupLink = (newGradeView: string) => (
      <a
        href={
          config == "" || newGradeView == "Hybrid" || tiers[tierStr]
            ? "#"
            : undefined
        }
        onClick={(event) => {
          event.preventDefault();
          if (newGradeView == "None") {
            setConfig("");
          } else {
            setConfig(configParams(gradeFormat, tierStr, newGradeView));
          }
        }}
      >
        {maybeBold(
          config == "" ? newGradeView == "None" : gradeView == newGradeView,
          newGradeView
        )}
      </a>
    );

    const endLine = (
      <span className="small">
        {viewGroupLink("Hybrid")} |&nbsp;
        {viewGroupLink("Inline")} |&nbsp;
        {viewGroupLink("Rows")} |&nbsp;
        {viewGroupLink("None")}
      </span>
    );

    const helpTooltipView = (
      <Tooltip id={`helpTooltip${nameAsId}View`}>
        Hybrid: Ranks/%les shown in same row as stats, only for top/bottom 25%.
        <br />
        <br />
        Inline: Ranks/%les shown in same row as stats, all stats shown
        <br />
        <br />
        Rows: Ranks/%les shown as separate rows in the table
      </Tooltip>
    );
    const helpTooltipOvelay = (
      <OverlayTrigger placement="auto" overlay={helpTooltipView}>
        <b>(?)</b>
      </OverlayTrigger>
    );

    const hideTooltipTier = (
      <Tooltip id={`hideTooltip${nameAsId}`}>
        Temporarily hides the global grade control settings. Will re-appear on
        page refresh or when toggling grades on/off above.
      </Tooltip>
    );
    const hideGradeSettings = (
      <OverlayTrigger placement="auto" overlay={hideTooltipTier}>
        <span className="align-middle">
          <a
            href="#"
            onClick={(event) => {
              event.preventDefault();
              globalSettings?.onHide();
            }}
          >
            <FontAwesomeIcon icon={faWindowClose}></FontAwesomeIcon>
          </a>
        </span>
      </OverlayTrigger>
    );
    return (
      <span>
        <small>
          {title}
          {title ? " " : ""}Team Grades {helpTierOverlay}
        </small>
        : {topLine} {"//"} {bottomLine}
        {globalSettings ? (
          <span>
            &nbsp;{"//"} {endLine} <small>{helpTooltipOvelay}</small>
            &nbsp;&nbsp;&nbsp;{hideGradeSettings}
          </span>
        ) : undefined}
      </span>
    );
  };

  /** Build the rows containing the grade information for a team
   * TODO: merge common code between this and buildPlayerControlState (mostly just unused tooltips?)
   *  and also merge any common logic this and ControlState and buildProjectedPlayerGradeTableRows
   * (but I'm actually not sure it's worth it)
   */
  static readonly buildTeamGradeTableRows: (
    rowLetter: string,
    p: TeamProps
  ) => GenericTableRow[] = (rowLetter, p) => {
    const {
      isFullSelection,
      selectionType,
      config,
      setConfig,
      teamStats: { comboTier, highTier, mediumTier, lowTier },
      team,
    } = p;
    const maybeEquiv = isFullSelection ? "" : "Equiv ";
    const nameAsId = selectionType.replace(/[^A-Za-z0-9_]/g, "");
    const title =
      selectionType != "baseline"
        ? `'${rowLetter}' Lineups`
        : rowLetter != "Base"
        ? `Base ${rowLetter}`
        : "Baseline";
    const tiers = {
      //(handy LUT)
      High: highTier,
      Medium: mediumTier,
      Low: lowTier,
      Combo: comboTier,
    } as Record<string, DivisionStatistics | undefined>;

    const configStr = config.split(":");
    const gradeFormat = configStr[0];
    const tierStrTmp = configStr?.[1] || "Combo";
    const tierStr = tiers[tierStrTmp]
      ? tierStrTmp
      : tiers["Combo"]
      ? "Combo"
      : tiers["High"]
      ? "High"
      : tierStrTmp;
    //(if set tier doesn't exist just fallback)
    const tierToUse = tiers[tierStr];
    const teamPercentiles = tierToUse
      ? GradeUtils.buildTeamPercentiles(
          tierToUse,
          team,
          GradeUtils.teamFieldsToRecord,
          gradeFormat == "rank"
        )
      : {};

    const tempoObj = DerivedStatsUtils.injectPaceStats(team, {}, false);
    const tempoGrade = tierToUse
      ? GradeUtils.buildTeamPercentiles(
          tierToUse,
          tempoObj,
          ["tempo"],
          gradeFormat == "rank"
        )
      : {};
    if (tempoGrade.tempo) {
      tempoGrade.tempo.extraInfo = "(Grade for unadjusted poss/g)";
    }
    teamPercentiles.off_poss = tempoGrade.tempo;

    // Special field formatting:
    const eqRankTooltip = (
      <Tooltip id={`eqRankTooltip${nameAsId}`}>
        The approximate rank for each stat against the "tier" (D1/High/etc) as
        if it were over the entire season
      </Tooltip>
    );
    const percentileTooltip = (
      <Tooltip id={`percentileTooltip${nameAsId}`}>
        The percentile of each stat against the "tier" (D1/High/etc){" "}
      </Tooltip>
    );

    (teamPercentiles as any).off_title =
      gradeFormat == "pct" ? (
        <OverlayTrigger placement="auto" overlay={percentileTooltip}>
          <small>
            <b>Pctiles</b>
          </small>
        </OverlayTrigger>
      ) : (
        <OverlayTrigger placement="auto" overlay={eqRankTooltip}>
          <small>
            <b>{maybeEquiv}Ranks</b>
          </small>
        </OverlayTrigger>
      );

    if (gradeFormat == "pct") {
      (teamPercentiles as any).def_net = _.isNumber(
        teamPercentiles.off_raw_net?.value
      ) ? (
        <small
          style={CommonTableDefs.getTextShadow(
            teamPercentiles.off_raw_net,
            CbbColors.off_pctile_qual
          )}
        >
          <i>({(100 * teamPercentiles.off_raw_net!.value!).toFixed(1)}%)</i>
        </small>
      ) : undefined;
    } else {
      //Rank
      (teamPercentiles as any).def_net = _.isNumber(
        teamPercentiles.off_raw_net?.value
      ) ? (
        <span
          style={CommonTableDefs.getTextShadow(
            teamPercentiles.off_raw_net,
            CbbColors.off_pctile_qual
          )}
        >
          <i>
            <small>(</small>
            {GenericTableOps.gradeOrHtmlFormatter(teamPercentiles.off_raw_net)}
            <small>)</small>
          </i>
        </span>
      ) : undefined;
    }

    const offPrefixFn = (key: string) => "off_" + key;
    const offCellMetaFn = (key: string, val: any) => "off";
    const defPrefixFn = (key: string) => "def_" + key;
    const defCellMetaFn = (key: string, val: any) => "def";
    const tableConfig = buildGradesTable(
      CommonTableDefs.onOffTable(),
      teamBuilderInfo,
      false
    );
    const tableData = [
      GenericTableOps.buildRowSeparator(),
      GenericTableOps.buildDataRow(
        teamPercentiles,
        offPrefixFn,
        offCellMetaFn,
        tableConfig
      ),
      GenericTableOps.buildDataRow(
        teamPercentiles,
        defPrefixFn,
        defCellMetaFn,
        tableConfig
      ),
      //(for some reason the snapshot build repeats bottomLine if the "//" aren't represented like this):
      GenericTableOps.buildTextRow(
        GradeTableUtils.buildTeamGradeControlState(title, p),
        ""
      ),
    ];
    return tableData;
  };

  /** Builds team specific tier info used for building player grades */
  static readonly buildTeamTierInfo = (
    gradeConfig: string,
    globalStats: StatsCaches | undefined
  ) => {
    const configStr = gradeConfig.split(":");
    const gradeFormat = configStr[0];
    const tierStrTmp = configStr?.[1] || "Combo";

    const tiers = {
      //(handy LUT)
      High: globalStats?.highTier,
      Medium: globalStats?.mediumTier,
      Low: globalStats?.lowTier,
      Combo: globalStats?.comboTier,
    } as Record<string, DivisionStatistics | undefined>;

    const tierStr = tiers[tierStrTmp]
      ? tierStrTmp
      : tiers["Combo"]
      ? "Combo"
      : tiers["High"]
      ? "High"
      : tierStrTmp;
    const tierToUse = tiers[tierStr];

    return { tierStr, tierToUse, tiers, gradeFormat };
  };

  /** Builds some player specific tier info used for building player grades */
  static readonly buildPlayerTierInfo = (
    gradeConfig: string,
    globalStats: StatsCaches,
    playerPosStats: PositionStatsCache
  ) => {
    const configStr = (gradeConfig || ParamDefaults.defaultEnabledGrade).split(
      ":"
    );
    const gradeFormat = configStr[0];
    const tierStrTmp = configStr?.[1] || "Combo";
    //(if set tier doesn't exist just fallback)
    const posGroup = configStr?.[2] || "All";
    //(defaults to hybrid)
    const gradeView = configStr?.[3] || "Hybrid"; //Hybrid / Standalone / Integrated

    const statsCacheToDivisionStats = (s: StatsCaches) => {
      return {
        High: s.highTier,
        Medium: s.mediumTier,
        Low: s.lowTier,
        Combo: s.comboTier,
      };
    };
    const globalTiers = {
      //(handy LUT)
      High: globalStats.highTier,
      Medium: globalStats.mediumTier,
      Low: globalStats.lowTier,
      Combo: globalStats.comboTier,
    } as Record<string, DivisionStatistics | undefined>;
    const tiers = (
      posGroup == "All"
        ? globalTiers
        : statsCacheToDivisionStats(playerPosStats[posGroup] || {})
    ) as Record<string, DivisionStatistics | undefined>;

    const tierStr = tiers[tierStrTmp]
      ? tierStrTmp
      : tiers["Combo"]
      ? "Combo"
      : tiers["High"]
      ? "High"
      : tierStrTmp;
    const tierToUse = tiers[tierStr];

    return {
      tierStr,
      tierToUse,
      tiers,
      globalTiers,
      gradeFormat,
      posGroup,
      gradeView,
    };
  };

  /** Builds a text element with a shadow - TODO: apply to code in ControlState */
  static readonly buildPlayerGradeTextElement = (
    stat: Statistic,
    gradeFormat: string,
    colorPicker: (n: number) => string
  ) => {
    const shadow = CommonTableDefs.getTextShadow(stat, colorPicker, "20px", 4);
    return (
      <span style={shadow}>
        {GenericTableOps.approxRankOrHtmlFormatter(stat)}
        {gradeFormat == "pct" ? "%" : ""}
      </span>
    );
  };

  /** Common logic for all grade building - returns the interactive control row and some required metadata
   * TODO: merge common code between this and buildTeamGradeTableRows (mostly just unused tooltips?)
   * TODO: need to plumb in hide button here
   */
  static readonly buildPlayerGradeControlState: (
    controlRowId: string,
    p: CommonPlayerProps,
    globalSettings?: {
      countsAreExample: boolean;
      onHide: () => void;
    }
  ) => {
    controlRow: React.ReactNode;
    tierToUse: DivisionStatistics | undefined;
    gradeFormat: string;
  } = (
    controlRowId,
    { selectionTitle, config, setConfig, playerStats, playerPosStats },
    globalSettings
  ) => {
    // (Unused because the OverlayTrigger doesn't work, see below)
    //  const tooltipMap = {
    //    Combo: (
    //      <Tooltip id={`comboTooltip${controlRowId}`}>
    //        Compare each stat against the set of all available D1 teams
    //      </Tooltip>
    //    ),
    //    High: (
    //      <Tooltip id={`highTooltip${controlRowId}`}>
    //        Compare each stat against the "high tier" of D1 (high majors, mid-high
    //        majors, any team in the T150)
    //      </Tooltip>
    //    ),
    //    Medium: (
    //      <Tooltip id={`mediumTooltip${controlRowId}`}>
    //        Compare each stat against the "medium tier" of D1
    //        (mid/mid-high/mid-low majors, if in the T275)
    //      </Tooltip>
    //    ),
    //    Low: (
    //      <Tooltip id={`lowTooltip${controlRowId}`}>
    //        Compare each stat against the "low tier" of D1 (low/mid-low majors, if
    //        outside the T250)
    //      </Tooltip>
    //    ),
    //  } as Record<string, any>;

    const maybeBold = (bold: boolean, html: React.ReactNode) =>
      bold ? <b>{html}</b> : html;

    const {
      tierStr,
      tierToUse,
      tiers,
      globalTiers,
      gradeFormat,
      posGroup,
      gradeView,
    } = GradeTableUtils.buildPlayerTierInfo(
      config,
      playerStats,
      playerPosStats
    );

    const configParams = (
      newGradeFormat: string,
      newTier: string,
      newPosGroup: string,
      newGradeView: string
    ) => {
      return [`${newGradeFormat}:${newTier}`]
        .concat(
          newPosGroup == "All"
            ? newGradeView == "Hybrid"
              ? []
              : [`:`]
            : [`:${newPosGroup}`]
        )
        .concat(newGradeView == "Hybrid" ? [] : [`:${newGradeView}`])
        .join("");
    };
    const tierLinkTmp = (tier: string, showCount: boolean = false) => (
      <a
        href={config == "" || globalTiers[tier] ? "#" : undefined}
        onClick={(event) => {
          event.preventDefault();
          setConfig(configParams(gradeFormat, tier, posGroup, gradeView));
        }}
      >
        {tier == "Combo" ? "D1" : tier.substring(0, 1)}
        {showCount && globalTiers[tier]
          ? ` (${globalSettings?.countsAreExample ? `eg ` : ``}${
              globalTiers[tier]?.tier_sample_size
            })`
          : ""}
      </a>
    );
    const tierLink = (tier: string) =>
      tier == tierStr ? <b>{tierLinkTmp(tier, true)}</b> : tierLinkTmp(tier);

    const topLine = (
      <span className="small">
        {tierLink("Combo")} | {tierLink("High")} | {tierLink("Medium")} |{" "}
        {tierLink("Low")}
      </span>
    );

    const posLinkTmp = (
      newPosGroupTitle: string,
      newPosGroup: string,
      showCount: boolean = false
    ) => (
      <a
        href={
          config == "" || newPosGroup == "All" || tiers[tierStr]
            ? "#"
            : undefined
        }
        onClick={(event) => {
          event.preventDefault();
          setConfig(configParams(gradeFormat, tierStr, newPosGroup, gradeView));
        }}
      >
        {newPosGroupTitle}
        {showCount && tiers[tierStr]
          ? ` (${globalSettings?.countsAreExample ? `eg ` : ``}${
              tiers[tierStr]?.tier_sample_size || "?"
            })`
          : ""}
      </a>
    );
    const posGroupLink = (newPosGroupTitle: string, newPosGroup: string) =>
      newPosGroup == posGroup ? (
        <b>{posLinkTmp(newPosGroupTitle, newPosGroup, newPosGroup != "All")}</b>
      ) : (
        posLinkTmp(newPosGroupTitle, newPosGroup)
      );

    const midLine = (
      <span className="small">
        {posGroupLink("All", "All")} |&nbsp;
        {posGroupLink("Handlers", "BH")} | {posGroupLink("Guards", "G")} |{" "}
        {posGroupLink("Wings", "W")} |&nbsp;
        {posGroupLink("PFs", "PF")} | {posGroupLink("Centers", "C")} |{" "}
        {posGroupLink("Frontcourt", "FC")}
      </span>
    );

    // (Unused because the OverlayTrigger doesn't work, see below)
    //    const eqRankShowTooltip = (
    //    <Tooltip id={`eqRankShowTooltip${controlRowId}`}>
    //      Show the approximate rank for each stat against the "tier" (D1/High/etc)
    //      as if it were over the entire season
    //    </Tooltip>
    //  );
    //  const percentileShowTooltip = (
    //    <Tooltip id={`percentileShowTooltip${controlRowId}`}>
    //      Show the percentile of each stat against the "tier" (D1/High/etc){" "}
    //    </Tooltip>
    //  );

    const bottomLine = (
      <span className="small">
        {maybeBold(
          gradeFormat == "rank",
          <a
            href={"#"}
            onClick={(event) => {
              event.preventDefault();
              setConfig(configParams("rank", tierStr, posGroup, gradeView));
            }}
          >
            Ranks
          </a>
        )}
        &nbsp;|{" "}
        {maybeBold(
          gradeFormat == "pct",
          <a
            href="#"
            onClick={(event) => {
              event.preventDefault();
              setConfig(configParams("pct", tierStr, posGroup, gradeView));
            }}
          >
            %iles
          </a>
        )}
      </span>
    );

    const helpTooltipTier = (
      <Tooltip id={`helpTooltip${controlRowId}`}>
        High Tier: high majors, mid-high majors, plus any team in the T150
        <br />
        Medium Tier: mid/mid-high/mid-low majors, if in the T275
        <br />
        Low Tier: low/mid-low majors, or if outside the T250
      </Tooltip>
    );
    const helpOverlayTier = (
      <OverlayTrigger placement="auto" overlay={helpTooltipTier}>
        <b>(?)</b>
      </OverlayTrigger>
    );

    const viewGroupLink = (newGradeView: string) => (
      <a
        href={
          config == "" || newGradeView == "Hybrid" || tiers[tierStr]
            ? "#"
            : undefined
        }
        onClick={(event) => {
          event.preventDefault();
          if (newGradeView == "None") {
            setConfig("");
          } else {
            setConfig(
              configParams(gradeFormat, tierStr, posGroup, newGradeView)
            );
          }
        }}
      >
        {maybeBold(
          config == "" ? newGradeView == "None" : gradeView == newGradeView,
          newGradeView
        )}
      </a>
    );

    const endLine = (
      <span className="small">
        {viewGroupLink("Hybrid")} |&nbsp;
        {viewGroupLink("Inline")} |&nbsp;
        {viewGroupLink("Rows")} |&nbsp;
        {viewGroupLink("None")}
      </span>
    );

    const helpTooltipView = (
      <Tooltip id={`helpTooltip${controlRowId}View`}>
        Hybrid: Ranks/%les shown in same row as stats, only for extremes (T/B
        25%). In "Ranks" mode, B25% stats are shown as %les.
        <br />
        <br />
        Inline: Ranks/%les shown in same row as stats, all stats shown
        <br />
        <br />
        Rows: Ranks/%les shown as separate rows in the table
      </Tooltip>
    );
    const helpTooltipOvelay = (
      <OverlayTrigger placement="auto" overlay={helpTooltipView}>
        <b>(?)</b>
      </OverlayTrigger>
    );

    const hideTooltipTier = (
      <Tooltip id={`hideTooltip${controlRowId}`}>
        Temporarily hides the global grade control settings. Will re-appear on
        page refresh or when toggling grades on/off above.
      </Tooltip>
    );
    const hideGradeSettings = (
      <OverlayTrigger placement="auto" overlay={hideTooltipTier}>
        <span className="align-middle">
          <a
            href="#"
            onClick={(event) => {
              event.preventDefault();
              globalSettings?.onHide();
            }}
          >
            <FontAwesomeIcon icon={faWindowClose}></FontAwesomeIcon>
          </a>
        </span>
      </OverlayTrigger>
    );

    return {
      //(for some reason the snapshot build repeats the xxxLine if the "//" aren't represented like this):
      controlRow: (
        <span>
          <small>
            {selectionTitle} {helpOverlayTier}
          </small>
          : {topLine} {"//"} {midLine} {"//"} {bottomLine}
          {globalSettings ? (
            <span>
              &nbsp;{"//"} {endLine} <small>{helpTooltipOvelay}</small>
              &nbsp;&nbsp;&nbsp;{hideGradeSettings}
            </span>
          ) : undefined}
        </span>
      ),
      tierToUse,
      gradeFormat,
    };
  };

  /** Builds an element showing the player's net RAPM grade with a color-coded backdrop */
  static readonly buildPlayerNetGrade = (
    rapmMargin: Statistic | undefined,
    gradeFormat: string,
    leaderboardMode: boolean,
    integratedMode: boolean
  ) => {
    const maybeSmall = (node: React.ReactNode) => {
      return gradeFormat == "pct" ? <small>{node}</small> : node;
    };
    if (rapmMargin) {
      const shadow = CommonTableDefs.getTextShadow(
        rapmMargin,
        CbbColors.off_pctile_qual,
        "20px",
        4
      );
      return (
        <span>
          {integratedMode ? undefined : (
            <small>
              <b>net</b>:{" "}
            </small>
          )}
          {maybeSmall(
            <span style={shadow}>
              {GenericTableOps.approxRankOrHtmlFormatter(rapmMargin)}
              {gradeFormat == "pct" ? "%" : ""}
            </span>
          )}
        </span>
      );
    } else {
      return leaderboardMode ? null : (
        <small>
          <i>
            (net rank: NA)<sup>*</sup>
          </i>
        </small>
      );
    }
  };

  /** Adds extra info with sample size warnings  */
  static readonly injectPlayerSampleSizeDisclaimers = (
    player: PureStatSet,
    playerPercentiles: PureStatSet
  ) => {
    // Check whether fields have sufficient info to be displayed without a warning
    const possPct = player.off_team_poss_pct?.value || 0;
    if (
      playerPercentiles.off_team_poss_pct &&
      possPct < GradeUtils.minPossPctForInclusion
    ) {
      playerPercentiles.off_team_poss_pct.extraInfo =
        `Player poss% sits under qualifying criteria of [${(
          100 * GradeUtils.minPossPctForInclusion
        ).toFixed(0)}%], ` +
        `treat all fields' ranks/percentiles as unreliable.`;
    }
    GradeUtils.playerFieldsWithExtraCriteria.forEach((field) => {
      const criteriaInfo = GradeUtils.playerFields[field];
      const playerPercentile = playerPercentiles[field];
      if (
        criteriaInfo &&
        playerPercentile &&
        !GradeUtils.meetsExtraCriterion(player, criteriaInfo)
      ) {
        const hasAnySamplesAtAll = (player[criteriaInfo[0]]?.value || 0) > 0;
        if (hasAnySamplesAtAll) {
          const criteriaField = criteriaInfo[0];
          const criteriaVal = criteriaInfo[1];
          const actualVal = player[criteriaField]?.value || 0;
          const criteriaIsPct = criteriaVal <= 1.0;
          const criteriaValStr =
            (criteriaIsPct ? criteriaVal * 100 : criteriaVal).toFixed(0) +
            (criteriaIsPct ? "%" : "");
          const actualValStr =
            (criteriaIsPct ? actualVal * 100 : actualVal).toFixed(0) +
            (criteriaIsPct ? "%" : "");
          playerPercentile.extraInfo = `This grade is based on insufficient data ([${criteriaField}]: [${actualValStr}] < [${criteriaValStr}]), treat as unreliable.`;
        } else {
          delete playerPercentiles[field]; //(no data at all, just show nothing)
        }
      } else if (playerPercentile) {
        //(do nothing)
      } else {
        delete playerPercentiles[field]; //(nothing worth showing)
      }
    });
  };

  /** Build the rows containing the grade information for a team
   * TODO: merge any common logic this and buildTeamGradeTableRows and buildProjectedPlayerGradeTableRows
   * (but I'm actually not sure it's worth it)
   */
  static readonly buildPlayerGradeTableRows: (
    p: PlayerProps
  ) => GenericTableRow[] = ({
    isFullSelection,
    selectionTitle,
    config,
    setConfig,
    playerStats,
    playerPosStats,
    player,
    expandedView,
    possAsPct,
    factorMins,
    includeRapm,
    leaderboardMode,
  }) => {
    const equivOrApprox = isFullSelection ? "Approx" : "Equiv";
    const nameAsId = (selectionTitle + (player.code || "unknown")).replace(
      /[^A-Za-z0-9_]/g,
      ""
    );

    const { controlRow, tierToUse, gradeFormat } =
      GradeTableUtils.buildPlayerGradeControlState(nameAsId, {
        selectionTitle,
        config,
        setConfig,
        playerStats,
        playerPosStats,
      });

    const playerPercentiles = tierToUse
      ? GradeUtils.buildPlayerPercentiles(
          tierToUse,
          player,
          _.keys(GradeUtils.playerFields),
          gradeFormat == "rank"
        )
      : {};

    GradeTableUtils.injectPlayerSampleSizeDisclaimers(
      player,
      playerPercentiles
    );

    const maybeSmall = (node: React.ReactNode) => {
      return gradeFormat == "pct" ? <small>{node}</small> : node;
    };
    const maybeWithExtraInfo = (node: React.ReactElement, field: string) => {
      const extraInfo = playerPercentiles[field]?.extraInfo;
      if (extraInfo) {
        const extraInfoTooltip = (
          <Tooltip id={`extraInfo${field}${nameAsId}`}>{extraInfo}</Tooltip>
        );
        return (
          <OverlayTrigger placement="auto" overlay={extraInfoTooltip}>
            <span>
              {node}
              <small>
                <sup className={styles.infoBadge}></sup>
              </small>
            </span>
          </OverlayTrigger>
        );
      } else {
        return node;
      }
    };

    if (playerPercentiles.off_3p_ast) {
      const shadow = CommonTableDefs.getTextShadow(
        playerPercentiles.off_3p_ast,
        CbbColors.pctile_freq[0]
      );
      (playerPercentiles as any).def_3pr = _.chain(
        <i style={shadow}>
          {GenericTableOps.approxRankOrHtmlFormatter(
            playerPercentiles.off_3p_ast
          )}
        </i>
      )
        .thru((n) => maybeWithExtraInfo(n, "off_3p_ast"))
        .thru((n) => maybeSmall(n))
        .value();
    }
    if (playerPercentiles.off_2prim_ast) {
      const shadow = CommonTableDefs.getTextShadow(
        playerPercentiles.off_2prim_ast,
        CbbColors.pctile_freq[0]
      );
      (playerPercentiles as any).def_2primr = _.chain(
        <i style={shadow}>
          {GenericTableOps.approxRankOrHtmlFormatter(
            playerPercentiles.off_2prim_ast
          )}
        </i>
      )
        .thru((n) => maybeWithExtraInfo(n, "off_2prim_ast"))
        .thru((n) => maybeSmall(n))
        .value();
    }
    if (playerPercentiles.off_ft) {
      const shadow = CommonTableDefs.getTextShadow(
        playerPercentiles.off_ft,
        CbbColors.pctile_qual[0]
      );
      (playerPercentiles as any).def_3p = _.chain(
        <i style={shadow}>
          {GenericTableOps.approxRankOrHtmlFormatter(playerPercentiles.off_ft)}
        </i>
      )
        .thru((n) => maybeWithExtraInfo(n, "off_ft"))
        .thru((n) => maybeSmall(n))
        .value();
    }

    // Convert some fields

    // Special field formatting:
    const netRapmField = factorMins
      ? "off_adj_rapm_prod_margin"
      : "off_adj_rapm_margin";
    const rapmMargin = playerPercentiles[netRapmField];
    const extraMsg =
      expandedView && !rapmMargin && !leaderboardMode ? (
        <span>
          <br />
          <br />
          Enable RAPM to see a net production ranking for this player
        </span>
      ) : null;

    const eqRankTooltip = (
      <Tooltip id={`eqRankTooltip${nameAsId}`}>
        The approximate rank for each stat against the "tier" (D1/High/etc) as
        if it were over the entire season{extraMsg}
      </Tooltip>
    );
    const percentileTooltip = (
      <Tooltip id={`percentileTooltip${nameAsId}`}>
        The percentile of each stat against the "tier" (D1/High/etc){extraMsg}
      </Tooltip>
    );

    const netInfo = _.thru(expandedView, (__) => {
      if (expandedView) {
        return GradeTableUtils.buildPlayerNetGrade(
          rapmMargin,
          gradeFormat,
          leaderboardMode || false,
          false
        );
      }
    });
    (playerPercentiles as any).off_title =
      gradeFormat == "pct" ? (
        <OverlayTrigger placement="auto" overlay={percentileTooltip}>
          <div>
            <small>
              <b>Pctiles</b>
            </small>
            {netInfo ? <br /> : null}
            {netInfo}
          </div>
        </OverlayTrigger>
      ) : (
        <OverlayTrigger placement="auto" overlay={eqRankTooltip}>
          <div>
            <small>
              <b>{equivOrApprox} Ranks</b>
            </small>
            {netInfo ? <br /> : null}
            {netInfo}
          </div>
        </OverlayTrigger>
      );

    const offPrefixFn = (key: string) => "off_" + key;
    const offCellMetaFn = (key: string, val: any) => "off";
    const defPrefixFn = (key: string) => "def_" + key;
    const defCellMetaFn = (key: string, val: any) => "def";
    const tableConfig = buildGradesTable(
      CommonTableDefs.onOffIndividualTable(
        expandedView,
        possAsPct,
        factorMins,
        includeRapm
      ),
      playerBuilderInfo,
      true,
      expandedView
    );
    const tableData = [
      GenericTableOps.buildDataRow(
        playerPercentiles,
        offPrefixFn,
        offCellMetaFn,
        tableConfig
      ),
    ]
      .concat(
        expandedView
          ? GenericTableOps.buildDataRow(
              playerPercentiles,
              defPrefixFn,
              defCellMetaFn,
              tableConfig
            )
          : []
      )
      .concat([GenericTableOps.buildTextRow(controlRow, "")])
      .concat(leaderboardMode ? [] : [GenericTableOps.buildRowSeparator()]);
    return tableData;
  };

  /** Build the rows containing the grade information for a team
   * TODO: merge any common logic this and buildTeamGradeTableRows and buildProjectedPlayerGradeTableRows
   * (but I'm actually not sure it's worth it)
   */
  static readonly buildProjectedPlayerGradeTableRows: (
    p: ProjectedPlayerProps
  ) => GenericTableRow[] = ({
    isFullSelection,
    selectionTitle,
    config,
    setConfig,
    playerStats,
    playerPosStats,
    code,
    playerProjections,
    evalMode,
    offSeasonMode,
    factorMins,
    caliberMode,
    enableNil,
  }) => {
    const equivOrApprox = isFullSelection ? "Approx" : "Equiv";
    const nameAsId = (selectionTitle + (code || "unknown")).replace(
      /[^A-Za-z0-9_]/g,
      ""
    );

    const { controlRow, tierToUse, gradeFormat } =
      GradeTableUtils.buildPlayerGradeControlState(nameAsId, {
        selectionTitle,
        config,
        setConfig,
        playerStats,
        playerPosStats,
      });

    const netRapmField = factorMins
      ? "off_adj_rapm_prod_margin"
      : "off_adj_rapm_margin";

    const fieldSuffix = factorMins ? "_prod" : "";

    const playerPercentiles = _.transform(
      ["good", "bad", "ok", "actual"],
      (acc, v) => {
        const isActualStats = v == "actual";
        if (!isActualStats || playerProjections.actual_net) {
          const tmp: PureStatSet = {};

          tmp[`off_adj_rapm${fieldSuffix}`] = playerProjections[`${v}_off`];
          tmp[`def_adj_rapm${fieldSuffix}`] = playerProjections[`${v}_def`];
          tmp[netRapmField] = playerProjections[`${v}_net`];

          const perProjectionPercentiles = tierToUse
            ? GradeUtils.buildPlayerPercentiles(
                tierToUse,
                tmp,
                [
                  `off_adj_rapm${fieldSuffix}`,
                  `def_adj_rapm${fieldSuffix}`,
                  netRapmField,
                ],
                gradeFormat == "rank"
              )
            : {};

          acc[`${v}_off`] =
            perProjectionPercentiles[`off_adj_rapm${fieldSuffix}`];
          acc[`${v}_def`] =
            perProjectionPercentiles[`def_adj_rapm${fieldSuffix}`];
          acc[`${v}_net`] = perProjectionPercentiles[netRapmField];
        }
      },
      {} as PureStatSet
    );

    // Check whether fields have sufficient info to be displayed without a warning
    //TODO port this to actual_mpg
    //  const possPct = player.actualResults?.value || 0;
    //  if (
    //    playerActualPercentiles.off_team_poss_pct &&
    //    possPct < GradeUtils.minPossPctForInclusion
    //  ) {
    //    playerActualPercentiles.off_team_poss_pct.extraInfo =
    //      `Player poss% sits under qualifying criteria of [${(
    //        100 * GradeUtils.minPossPctForInclusion
    //      ).toFixed(0)}%], ` +
    //      `treat all fields' ranks/percentiles as unreliable.`;
    //  }

    // Convert some fields

    const eqRankTooltip = (
      <Tooltip id={`eqRankTooltip${nameAsId}`}>
        The approximate rank for each stat against the "tier" (D1/High/etc) as
        if it were over the entire season
      </Tooltip>
    );
    const percentileTooltip = (
      <Tooltip id={`percentileTooltip${nameAsId}`}>
        The percentile of each stat against the "tier" (D1/High/etc)
      </Tooltip>
    );

    (playerPercentiles as any).off_title =
      gradeFormat == "pct" ? (
        <OverlayTrigger placement="auto" overlay={percentileTooltip}>
          <div>
            <small>
              <b>Pctiles</b>
            </small>
          </div>
        </OverlayTrigger>
      ) : (
        <OverlayTrigger placement="auto" overlay={eqRankTooltip}>
          <div>
            <small>
              <b>{equivOrApprox} Ranks</b>
            </small>
          </div>
        </OverlayTrigger>
      );

    const tableConfig = buildGradesTable(
      TeamEditorTableUtils.tableDef(
        evalMode,
        offSeasonMode,
        factorMins,
        caliberMode,
        enableNil
      ),
      projectedPlayerBuilderInfo,
      true,
      false //(player true, expanded false)
    );
    const tableData = [
      GenericTableOps.buildDataRow(
        playerPercentiles,
        GenericTableOps.defaultFormatter,
        GenericTableOps.defaultCellMeta,
        tableConfig
      ),
      GenericTableOps.buildTextRow(controlRow, ""),
    ];
    return tableData;
  };
}
