// React imports:
import React, { useState } from "react";

// Next imports
import fetch from "isomorphic-unfetch";

import _ from "lodash";

import styles from "../../components/GenericTable.module.css";

// Bootstrap imports:
import "bootstrap/dist/css/bootstrap.min.css";
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

export type StatsCaches = {
  comboTier?: DivisionStatistics;
  highTier?: DivisionStatistics;
  mediumTier?: DivisionStatistics;
  lowTier?: DivisionStatistics;
};

export type PositionStatsCache = Record<string, StatsCaches>;

type TeamProps = {
  isFullSelection?: boolean;
  selectionType: "on" | "off" | "baseline";
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
          expandedView && player
            ? GenericTableOps.addTitle(
                "",
                "",
                CommonTableDefs.rowSpanCalculator,
                "",
                formatter
              )
            : GenericTableOps.addTitle(
                "",
                "",
                GenericTableOps.defaultRowSpanCalculator,
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
    "3pr": CbbColors.offOnlyPicker(...CbbColors.pctile_freq),
    "2pmidr": CbbColors.offOnlyPicker(...CbbColors.pctile_freq),
    "2primr": CbbColors.offOnlyPicker(...CbbColors.pctile_freq),
  },
  freq_pct: new Set(["usage", "assist"]),
};

/** Controls the formatting of the projected player grade tables */
const projectedPlayerBuilderInfo = {
  custom: {},
  freq_pct: new Set(["usage"]),
};

export type DivisionStatsCache = {
  year?: string;
  gender?: string;
  Combo?: DivisionStatistics;
  High?: DivisionStatistics;
  Medium?: DivisionStatistics;
  Low?: DivisionStatistics;
};

export class GradeTableUtils {
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
    Promise.all(fetchAll).then((jsons: any[]) => {
      setCache({
        year: inYear,
        gender: inGender, //(so know when to refresh cache)
        Combo: _.isEmpty(jsons[0]) ? undefined : jsons[0], //(if using tierOverride, it goes in here)
        High: _.isEmpty(jsons[1]) ? undefined : jsons[1],
        Medium: _.isEmpty(jsons[2]) ? undefined : jsons[2],
        Low: _.isEmpty(jsons[3]) ? undefined : jsons[3],
      });
    });
  };

  /** Build the rows containing the grade information for a team
   * TODO: merge common code between this and buildPlayerControlState (mostly just unused tooltips?)
   *  and also merge any common logic this and buildPlayerGradeTableRows and buildProjectedPlayerGradeTableRows
   * (but I'm actually not sure it's worth it)
   */
  static readonly buildTeamGradeTableRows: (p: TeamProps) => GenericTableRow[] =
    ({
      isFullSelection,
      selectionType,
      config,
      setConfig,
      teamStats: { comboTier, highTier, mediumTier, lowTier },
      team,
    }) => {
      const maybeEquiv = isFullSelection ? "" : "Equiv ";
      const nameAsId = selectionType.replace(/[^A-Za-z0-9_]/g, "");
      const title =
        selectionType == "on"
          ? "A Lineups"
          : selectionType == "off"
          ? "B Lineups"
          : "Baseline";
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
      const posGroup = configStr?.[2] || "All";

      const configParams = (newTier: string) => {
        const configParamBase = `${gradeFormat}:${newTier}`;
        if (posGroup == "All") {
          return configParamBase;
        } else {
          return `${configParamBase}:${posGroup}`;
        }
      };
      const tierLinkTmp = (tier: string) => (
        <a
          href={tiers[tier] ? "#" : undefined}
          onClick={(event) => {
            event.preventDefault();
            setConfig(configParams(tier));
          }}
        >
          {tier == "Combo" ? "D1" : tier}
          {tiers[tier] ? ` (${tiers[tier]?.tier_sample_size})` : ""}
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
                setConfig(`rank:${tierStrTmp}`);
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
                setConfig(`pct:${tierStrTmp}`);
              }}
            >
              Pctiles
            </a>
            //           </OverlayTrigger>
          )}
        </span>
      );

      const helpTooltip = (
        <Tooltip id={`helpTooltip${nameAsId}`}>
          High Tier: high majors, mid-high majors, plus any team in the T150
          <br />
          Medium Tier: mid/mid-high/mid-low majors, if in the T275
          <br />
          Low Tier: low/mid-low majors, or if outside the T250
        </Tooltip>
      );
      const helpOverlay = (
        <OverlayTrigger placement="auto" overlay={helpTooltip}>
          <b>(?)</b>
        </OverlayTrigger>
      );

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
              <b>Off Pctiles</b>
            </small>
          </OverlayTrigger>
        ) : (
          <OverlayTrigger placement="auto" overlay={eqRankTooltip}>
            <small>
              <b>Off {maybeEquiv}Ranks</b>
            </small>
          </OverlayTrigger>
        );
      (teamPercentiles as any).def_title =
        gradeFormat == "pct" ? (
          <OverlayTrigger placement="auto" overlay={percentileTooltip}>
            <small>
              <b>Def Pctiles</b>
            </small>
          </OverlayTrigger>
        ) : (
          <OverlayTrigger placement="auto" overlay={eqRankTooltip}>
            <small>
              <b>Def {maybeEquiv}Ranks</b>
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
              {GenericTableOps.gradeOrHtmlFormatter(
                teamPercentiles.off_raw_net
              )}
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
        CommonTableDefs.onOffTable,
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
          <span>
            <small>
              {title} Team Grades {helpOverlay}
            </small>
            : {topLine} {"//"} {bottomLine}
          </span>,
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
    const configStr = gradeConfig.split(":");
    const gradeFormat = configStr[0];
    const tierStrTmp = configStr?.[1] || "Combo";
    //(if set tier doesn't exist just fallback)
    const posGroup = configStr?.[2] || "All";

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

    return { tierStr, tierToUse, tiers, globalTiers, gradeFormat, posGroup };
  };

  /** Builds a text element with a shadow - TODO: apply to code in buildPlayerGradeTableRows */
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
   */
  static readonly buildPlayerGradeControlState: (
    controlRowId: string,
    p: CommonPlayerProps
  ) => {
    controlRow: GenericTableRow;
    tierToUse: DivisionStatistics | undefined;
    gradeFormat: string;
  } = (
    controlRowId: string,
    { selectionTitle, config, setConfig, playerStats, playerPosStats }
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

    const { tierStr, tierToUse, tiers, globalTiers, gradeFormat, posGroup } =
      GradeTableUtils.buildPlayerTierInfo(config, playerStats, playerPosStats);

    const configParams = (
      newGradeFormat: string,
      newTier: string,
      newPosGroup: string
    ) => {
      const configParamBase = `${newGradeFormat}:${newTier}`;
      if (newPosGroup == "All") {
        return configParamBase;
      } else {
        return `${configParamBase}:${newPosGroup}`;
      }
    };
    const tierLinkTmp = (tier: string, showCount: boolean = false) => (
      <a
        href={globalTiers[tier] ? "#" : undefined}
        onClick={(event) => {
          event.preventDefault();
          setConfig(configParams(gradeFormat, tier, posGroup));
        }}
      >
        {tier == "Combo" ? "D1" : tier}
        {showCount && globalTiers[tier]
          ? ` (${globalTiers[tier]?.tier_sample_size})`
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
        href={newPosGroup == "All" || tiers[tierStr] ? "#" : undefined}
        onClick={(event) => {
          event.preventDefault();
          setConfig(configParams(gradeFormat, tierStr, newPosGroup));
        }}
      >
        {newPosGroupTitle}
        {showCount && tiers[tierStr]
          ? ` (${tiers[tierStr]?.tier_sample_size || "?"})`
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

    const maybeBold = (bold: boolean, html: React.ReactNode) =>
      bold ? <b>{html}</b> : html;
    const bottomLine = (
      <span className="small">
        {maybeBold(
          gradeFormat == "rank",
          <a
            href={"#"}
            onClick={(event) => {
              event.preventDefault();
              setConfig(configParams("rank", tierStr, posGroup));
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
              setConfig(configParams("pct", tierStr, posGroup));
            }}
          >
            Pctiles
          </a>
        )}
      </span>
    );

    const helpTooltip = (
      <Tooltip id={`helpTooltip${controlRowId}`}>
        High Tier: high majors, mid-high majors, plus any team in the T150
        <br />
        Medium Tier: mid/mid-high/mid-low majors, if in the T275
        <br />
        Low Tier: low/mid-low majors, or if outside the T250
      </Tooltip>
    );
    const helpOverlay = (
      <OverlayTrigger placement="auto" overlay={helpTooltip}>
        <b>(?)</b>
      </OverlayTrigger>
    );

    return {
      //(for some reason the snapshot build repeats the xxxLine if the "//" aren't represented like this):
      controlRow: GenericTableOps.buildTextRow(
        <span>
          <small>
            {selectionTitle} {helpOverlay}
          </small>
          : {topLine} {"//"} {midLine} {"//"} {bottomLine}
        </span>,
        ""
      ),
      tierToUse,
      gradeFormat,
    };
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
        const shadow = CommonTableDefs.getTextShadow(
          rapmMargin,
          CbbColors.off_pctile_qual,
          "20px",
          4
        );
        return rapmMargin ? (
          <span>
            <small>
              <b>net</b>:{" "}
            </small>
            {maybeSmall(
              <span style={shadow}>
                {GenericTableOps.approxRankOrHtmlFormatter(rapmMargin)}
                {gradeFormat == "pct" ? "%" : ""}
              </span>
            )}
          </span>
        ) : leaderboardMode ? null : (
          <small>
            <i>
              (net rank: NA)<sup>*</sup>
            </i>
          </small>
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
      .concat([controlRow])
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
      controlRow,
    ];
    return tableData;
  };
}
