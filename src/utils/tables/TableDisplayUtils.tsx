// Bootstrap imports:

import Badge from "react-bootstrap/Badge";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

// Lodash:
import _ from "lodash";

// Util imports
import { CbbColors } from "../CbbColors";
import { PositionUtils } from "../stats/PositionUtils";

import { CommonTableDefs } from "../tables/CommonTableDefs";
import styles from "./TableDisplayUtils.module.css";
import {
  TeamStatSet,
  LineupStatSet,
  PureStatSet,
  Statistic,
  IndivStatSet,
  LineupEnrichment,
  TeamEnrichment,
  OnOffBaselineEnum,
  OnOffBaselineOtherEnum,
} from "../StatModels";
import { DerivedStatsUtils } from "../stats/DerivedStatsUtils";
import { CommonFilterParams, GameFilterParams } from "../FilterModels";
import { QueryUtils } from "../QueryUtils";
import { LineupUtils } from "../stats/LineupUtils";
import { UrlRouting } from "../UrlRouting";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBan } from "@fortawesome/free-solid-svg-icons";

import DOMPurify from "dompurify";

/** Encapsulates some of the logic used to build decorated lineups in LineupStatsTable */
export class TableDisplayUtils {
  /** If a string starts with < and ends with >, treats as HTML  */
  static safelyConvertToHtml = (html: string | undefined): React.ReactNode => {
    const trimmedHtml = _.trim(html || "");
    if (
      html &&
      trimmedHtml?.[0] == "<" &&
      trimmedHtml?.[trimmedHtml.length - 1] == ">"
    ) {
      const clean = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
          "b",
          "i",
          "em",
          "strong",
          "u",
          "br",
          "span",
          "sub",
          "sup",
          "small",
        ],
        ALLOWED_ATTR: ["style", "class"],
      });
      return <span dangerouslySetInnerHTML={{ __html: clean }} />;
    } else {
      return html;
    }
  };
  /** Very simple query/filter summary */
  static addQueryInfo(
    n: React.ReactNode,
    gameFilterParams: GameFilterParams,
    type: OnOffBaselineOtherEnum,
    otherIndex?: number,
    numPoss: number | undefined = undefined
  ) {
    const queryDisplayInfo = QueryUtils.queryDisplayStrs(gameFilterParams);
    const queryForType =
      type == "other"
        ? queryDisplayInfo.other[otherIndex || 0]
        : queryDisplayInfo[type];
    const baselineQuery = type == "baseline" ? "" : queryDisplayInfo.baseline;
    const query = baselineQuery
      ? `${queryForType}${queryForType ? " AND " : ""}BASE:[${baselineQuery}]`
      : queryForType;
    const possInfo = _.isNil(numPoss) ? "" : ` ([${numPoss}] team possessions)`;
    if (query) {
      //(don't display possInfo unless there is a query)
      const tooltip = (
        <Tooltip id={`${type}${otherIndex || 0}QueryInfo`}>
          {query + possInfo}
        </Tooltip>
      );
      return (
        <OverlayTrigger placement="auto" overlay={tooltip}>
          <u style={{ textDecorationStyle: "dotted" }}>{n}</u>
        </OverlayTrigger>
      );
    } else {
      return n;
    }
  }

  /** Adds a tooltip to the position code */
  static buildPositionTooltip(
    pos: string,
    typeStr: string,
    skipPosDiagInfo?: boolean,
    posBreakdown?: React.ReactNode
  ) {
    const fullPos = PositionUtils.idToPosition[pos] || "Unknown";
    return (
      <Tooltip id={pos + "Tooltip"}>
        {fullPos}
        <br />
        {posBreakdown ? (
          <div>
            {posBreakdown}
            <br />
            <br />
          </div>
        ) : (
          <br />
        )}
        Algorithmically assigned via stats from {typeStr} lineups.
        {skipPosDiagInfo
          ? ""
          : `See "Show Positional diagnostics" (gear icon on right) for more details.`}
      </Tooltip>
    );
  }

  /** Builds a handy lineup text for display row names, which truncates in mobile mode */
  static splitTextBuilder(
    includeCodes: string[],
    excludeCodes: string[]
  ): string {
    const codeTruncator = (s: string) => (s?.[0] || "") + (s?.[2] || "");
    const codeLimiter = (s: string) => s.substring(0, 8);

    return (
      `<div>` +
      `<small class="d-xl-none">` +
      includeCodes.map((p) => codeTruncator(p)).join(", ") +
      (_.isEmpty(excludeCodes)
        ? ""
        : ` ! ${excludeCodes.map((p) => `${codeTruncator(p)}`).join(", ")}`) +
      `</small>` +
      `<small class="d-none d-xl-block">` +
      includeCodes.map((p) => codeLimiter(p)).join(", ") +
      (_.isEmpty(excludeCodes)
        ? ""
        : ` NOT ${excludeCodes.map((p) => `${codeLimiter(p)}`).join(", ")}`) +
      `</small>` +
      `</div>`
    );
  }

  /** Builds a Game URL for a single lineup */
  static buildGameUrl(
    params: CommonFilterParams,
    sortedLineup: { code: string; id: string }[],
    excludes: { code: string; id: string }[]
  ): string {
    const [includes, extraExcludes] = _.partition(
      sortedLineup,
      (p) => p.id[0] != "-"
    );
    const allExcludes = excludes
      .map((p) => p.id)
      .concat(extraExcludes.map((p) => p.id.substring(1)));

    const isRawLineup = sortedLineup.length == 5 && allExcludes.length == 0;

    return UrlRouting.getGameUrl(
      {
        ...params,
        splitPhrases: [isRawLineup ? "Lineup" : "Lineups", ""],
        splitText: [
          TableDisplayUtils.splitTextBuilder(
            includes.map((p) => p.code),
            excludes.concat(extraExcludes).map((p) => p.code)
          ),
          "",
        ],
        teamDiffs: true,
        diffsHideDatasets: "on",
        playerDiffs: true,
        playerDiffsHideDatasets: "on",
        sortBy: "desc:off_team_poss_pct%:on",
        onQuery:
          `{${includes.map((p) => `"${p.id}"`).join(";")}}=${includes.length}` +
          (_.isEmpty(allExcludes)
            ? ""
            : ` AND NOT (${allExcludes.map((p) => `"${p}"`).join(" OR ")})`),
        offQuery: "",
        autoOffQuery: false,
        showExtraInfo: true,
        teamShotCharts: true,
        showRoster: true,
        showTeamPlayTypes: true,
        calcRapm: true,
        possAsPct: false,
        filter: `${sortedLineup.map((p) => `${p.code}`).join(",")}`,
        showExpanded: true,
      },
      {}
    );
  }

  /** Builds an information (over-)loaded lineup HTML */
  static buildDecoratedLineup(
    key: string,
    sortedLineup: { code: string; id: string }[],
    perLineupPlayerMap: Record<string, Record<string, any>>,
    positionFromPlayerKey: Record<string, { posClass: string }>,
    colorField: string,
    decorateLineup: boolean,
    lineupFontSize: string,
    params: CommonFilterParams,
    extendedTooltipView: boolean = false,
    onClickOverride?: (sortedLineup: { code: string; id: string }[]) => string
  ) {
    const tooltipBuilder = (pid: number) =>
      TableDisplayUtils.buildTooltipTexts(
        key + pid,
        sortedLineup,
        perLineupPlayerMap,
        positionFromPlayerKey,
        extendedTooltipView
      );

    if (decorateLineup) {
      const max = (sortedLineup?.length || 0) - 1;
      const lineupElement = sortedLineup.map(
        (cid: { code: string; id: string }, pid: number) => {
          return TableDisplayUtils.buildDecoratedPlayer(
            cid,
            perLineupPlayerMap,
            colorField,
            lineupFontSize,
            pid == max
          );
        }
      );
      return (
        <OverlayTrigger placement="auto" overlay={tooltipBuilder(0)}>
          {extendedTooltipView ? (
            <div>{lineupElement}</div>
          ) : (
            <a
              href={TableDisplayUtils.buildGameUrl(params, sortedLineup, [])}
              target="_blank"
              style={{ color: "inherit", textDecoration: "inherit" }}
              onClick={(e) => {
                if (onClickOverride) {
                  e.preventDefault();
                  const link = onClickOverride(sortedLineup);
                  window.open(link, "_blank");
                }
              }}
            >
              {lineupElement}
            </a>
          )}
        </OverlayTrigger>
      );
    } else {
      return (
        <OverlayTrigger placement="auto" overlay={tooltipBuilder(0)}>
          <span>
            <a href="#" style={{ color: "inherit", textDecoration: "inherit" }}>
              <b>
                {sortedLineup
                  .map((cid: { code: string; id: string }) => cid.code)
                  .join(" / ")}
              </b>
            </a>
          </span>
        </OverlayTrigger>
      );
    }
  }

  /** Builds a tooltip element for the entire lineup */
  static buildTooltipTexts(
    key: string,
    sortedLineup: { code: string; id: string }[],
    perLineupPlayerMap: Record<string, Record<string, any>>,
    positionFromPlayerKey: Record<string, { posClass: string }>,
    extendedView: boolean = false
  ) {
    const tooltipTexts = _.flatMap(
      sortedLineup,
      (cid: { id: string; code: string }) => {
        return cid.id[0] == "-"
          ? [`${cid.id.substring(1)} OFF`, ""]
          : TableDisplayUtils.buildTooltipText(
              cid,
              perLineupPlayerMap,
              positionFromPlayerKey,
              extendedView
            );
      }
    );
    const tooltip = (
      <Tooltip id={`${key}_info`}>
        {_.map(tooltipTexts, (t: string, i: number) => (
          <span key={"" + i}>
            {t}
            <br />
          </span>
        ))}
        {extendedView
          ? ""
          : `Click to open a more detailed analysis page for this lineup ${
              sortedLineup.length < 5 ? " family" : ""
            }`}
      </Tooltip>
    );

    return tooltip;
  }

  private static buildTooltipText(
    cid: { code: string; id: string },
    perLineupPlayerMap: Record<string, Record<string, any>>,
    positionFromPlayerKey: Record<string, { posClass: string }>,
    extendedView: boolean = false
  ) {
    // Some minimal info:
    const playerInfo = perLineupPlayerMap[cid.id] || {};
    const oRtgStr = (playerInfo.off_rtg?.value || 0).toFixed(0);
    const usageStr =
      (100 * (playerInfo.off_usage?.value || 0)).toFixed(0) + "%";
    const defRbStr = (100 * (playerInfo.def_orb?.value || 0)).toFixed(0) + "%";

    // Extended view:
    const adjOffRtg = playerInfo.off_adj_rtg?.value || 0;
    const adjOffRtgSgn = adjOffRtg >= 0 ? "+" : "";
    const adjOffRtgStr = extendedView
      ? adjOffRtgSgn + adjOffRtg.toFixed(1)
      : "";
    const assistRateStr = extendedView
      ? (100 * (playerInfo.off_assist?.value || 0)).toFixed(0) + "%"
      : "";
    const toRateStr = extendedView
      ? (100 * (playerInfo.off_to?.value || 0)).toFixed(0) + "%"
      : "";
    const offRbStr = extendedView
      ? (100 * (playerInfo.off_orb?.value || 0)).toFixed(0) + "%"
      : "";
    const freethrowRateStr = extendedView
      ? (100 * (playerInfo.off_ftr?.value || 0)).toFixed(0) + "%"
      : "";
    const efgStr = extendedView
      ? (100 * (playerInfo.off_efg?.value || 0)).toFixed(0) + "%"
      : "";
    const threePointRate = 100 * (playerInfo.off_3pr?.value || 0);
    const threePointRateStr = extendedView
      ? threePointRate.toFixed(0) + "%"
      : "";
    const threePointPctStr = extendedView
      ? (100 * (playerInfo.off_3p?.value || 0)).toFixed(0) + "%"
      : "";
    const rimRateStr = extendedView
      ? (100 * (playerInfo.off_2primr?.value || 0)).toFixed(0) + "%"
      : "";
    const rimPointPctStr = extendedView
      ? (100 * (playerInfo.off_2prim?.value || 0)).toFixed(0) + "%"
      : "";

    return extendedView
      ? [
          `${cid.id}`,
          _.chain([
            playerInfo.roster?.year_class,
            playerInfo.roster?.height,
            positionFromPlayerKey[cid.id]?.posClass,
          ])
            .filter((p) => p != undefined && p != "-")
            .join(" / ")
            .value(),
          `ORtg ${oRtgStr} on ${usageStr} (${adjOffRtgStr})`, //, FTR ${freethrowRateStr}`,
          `3P ${threePointPctStr} on ${threePointRateStr}, eFG ${efgStr}`,
          `Rim ${rimPointPctStr} on ${rimRateStr}, FTR ${freethrowRateStr}`,
          `AST ${assistRateStr} : TO ${toRateStr}`,
          `ORB ${offRbStr}, DRB ${defRbStr}`,
        ]
      : [
          `${cid.id}: ${positionFromPlayerKey[cid.id]?.posClass || "??"}`,
          `ORtg ${oRtgStr} on ${usageStr}, DRB ${defRbStr}`,
          "",
        ];
  }

  /** Builds the player HTML within a lineup */
  static buildDecoratedPlayer(
    cid: { code: string; id: string },
    perLineupPlayerMap: Record<string, Record<string, any>>,
    colorField: string,
    lineupFontSize: string,
    finalPlayer: boolean
  ) {
    const fontWeight = (playerInfo: Record<string, any>) => {
      const usage = _.max([
        0.1,
        _.min([playerInfo?.off_usage?.value || 0.2, 0.35]),
      ]);
      return (
        100 *
        _.round(
          usage < 0.2 //10 == 100 weight
            ? 1 + (usage - 0.1) * 40 //20 == 500 weight
            : 5 + (usage - 0.2) * 20,
          0
        )
      ); //35 ~= 800 weight
    };

    const colorChooser = (field: string) => {
      switch (field) {
        case "off_adj_rtg":
          return CbbColors.off_diff10_p100_redGreen;
        case "def_adj_rtg":
          return CbbColors.def_diff10_p100_redGreen;
        case "off_3pr":
          return CbbColors.fgr_offDef;
        default:
          return (val: number) => CbbColors.malformedDataColor;
      }
    };

    const singleColorField = (
      playerInfo: Record<string, any>,
      field: string
    ) => {
      const val = playerInfo[field]?.value;
      const color = colorChooser(field)(val) + "80"; //(opacity at the end)
      return color;
    };

    const buildBadges = (playerInfo: Record<string, any>) => {
      const _3pr = playerInfo.off_3pr?.value;
      const ftr = playerInfo.off_ftr?.value;
      const assist = playerInfo.off_assist?.value;
      return (
        <span style={{}}>
          {_3pr <= 0.05 ? (
            <sup className={styles.megaTwoPointBadge}></sup>
          ) : null}
          {_3pr >= 0.05 && _3pr < 0.2 ? (
            <sup className={styles.twoPointBadge}></sup>
          ) : null}
          {_3pr >= 0.45 && _3pr < 0.6 ? (
            <sup className={styles.threePointBadge}></sup>
          ) : null}
          {_3pr >= 0.6 ? (
            <sup className={styles.megaThreePointBadge}></sup>
          ) : null}
          {ftr > 0.35 && ftr < 0.6 ? (
            <sub className={styles.freeThrowBadge}></sub>
          ) : null}
          {ftr >= 0.6 ? (
            <sub className={styles.megaFreeThrowBadge}></sub>
          ) : null}
          {assist >= 0.18 && assist < 0.25 ? (
            <sup className={styles.assistBadge}></sup>
          ) : null}
          {assist >= 0.25 ? (
            <sup className={styles.megaAssistBadge}></sup>
          ) : null}
        </span>
      );
    };

    const isOffPlayer = cid.id[0] == "-";
    const playerInfo = isOffPlayer ? undefined : perLineupPlayerMap[cid.id];
    return (
      <span key={cid.code}>
        <span style={{ whiteSpace: "nowrap" }}>
          <Badge
            variant="light"
            style={{
              backgroundColor: playerInfo
                ? singleColorField(playerInfo, colorField)
                : isOffPlayer
                ? "#1a015aff"
                : "grey",
              // consider this in the future:
              //          background: `linear-gradient(to right, ${singleColorField(cid.id, colorField)}, white, ${singleColorField(cid.id, "def_adj_rtg")})`
            }}
          >
            <span
              style={{
                fontSize: lineupFontSize,
                opacity: isOffPlayer ? 0.75 : undefined,
                color: isOffPlayer ? "lightgrey" : undefined,
                fontWeight: playerInfo
                  ? fontWeight(playerInfo)
                  : isOffPlayer
                  ? 100
                  : undefined,
              }}
            >
              {isOffPlayer ? <FontAwesomeIcon icon={faBan} /> : ""}
              {isOffPlayer ? " " : ""}
              {LineupUtils.namePrettifier(cid.code)}
            </span>
          </Badge>
          {playerInfo ? buildBadges(playerInfo) : null}
        </span>
        {finalPlayer ? null : <span style={{ opacity: 0 }}> ; </span>}
      </span>
    );
  }

  /** Inject various assist info into the table cell inputs */
  static injectPlayTypeInfo(
    statSet: TeamStatSet | IndivStatSet | LineupStatSet,
    expandedView: boolean,
    playerView: boolean,
    teamSeasonLookup?: string
  ) {
    if (playerView) {
      // Put assist %s as the row underneath shot types:
      statSet.def_2primr = statSet.off_2prim_ast;
      statSet.def_2pmidr = statSet.off_2pmid_ast;
      statSet.def_3pr = statSet.off_3p_ast;
    }
    const assistBuilder = (stat: PureStatSet, offDef: "off" | "def") => {
      const rimPct = (100 * (stat[`${offDef}_ast_rim`]?.value || 0)).toFixed(0);
      const midPct = (100 * (stat[`${offDef}_ast_mid`]?.value || 0)).toFixed(0);
      const threePct = (100 * (stat[`${offDef}_ast_3p`]?.value || 0)).toFixed(
        0
      );
      return (
        <span>
          Assist breakdown:
          <li>{threePct}% for 3P</li>
          <li>{midPct}% for mid-range</li>
          <li>{rimPct}% at the rim</li>
        </span>
      );
    };
    const playCategoryBuilder = (stat: PureStatSet, offDef: "off" | "def") => {
      const mutableExtraStats = {} as PureStatSet;
      DerivedStatsUtils.injectScrambleStats(stat, offDef, mutableExtraStats);
      DerivedStatsUtils.injectTransitionStats(stat, offDef, mutableExtraStats);

      const scramblePct =
        100 * (mutableExtraStats[`${offDef}_scramble`]?.value || 0);
      const scramblePppDelta =
        mutableExtraStats[`${offDef}_scramble_delta_ppp`]?.value || 0;
      const scramblePm = scramblePppDelta > 0 ? "+" : "";

      const transPct = 100 * (mutableExtraStats[`${offDef}_trans`]?.value || 0);
      const transPppDelta =
        mutableExtraStats[`${offDef}_trans_delta_ppp`]?.value || 0;
      const transPm = transPppDelta > 0 ? "+" : "";

      return (
        <span>
          Play category breakdown:
          {transPct > 5 ? (
            <li>
              {transPct.toFixed(1)}% transition:
              <br />
              {transPm}
              {transPppDelta.toFixed(1)} pts/100
            </li>
          ) : (
            <li>{transPct.toFixed(1)}% transition</li>
          )}
          {scramblePct > 5 ? (
            <li>
              {scramblePct.toFixed(1)}% scramble:
              <br />
              {scramblePm}
              {scramblePppDelta.toFixed(1)} pts/100
            </li>
          ) : (
            <li>{scramblePct.toFixed(1)}% scramble</li>
          )}
        </span>
      );
    };
    const paceBuilder = (stat: PureStatSet, isPlayer: boolean) => {
      const mutableExtraStats = {} as PureStatSet;
      DerivedStatsUtils.injectPaceStats(stat, mutableExtraStats, isPlayer);
      const possPer40 = mutableExtraStats[`tempo`]?.value || 0;
      return possPer40 > 0 ? (
        <span>{possPer40.toFixed(1)} poss/g</span>
      ) : undefined;
    };

    if (statSet.off_assist) {
      statSet.off_assist.extraInfo = assistBuilder(statSet, "off");
    }
    // Offensive FT%: team/lineup/player
    if (statSet.off_ftr) {
      statSet.off_ftr.extraInfo = (
        <span>FT: {(100 * (statSet.off_ft?.value || 0)).toFixed(1)}%</span>
      );
    }
    if (playerView) {
      statSet.def_3p = statSet.off_ft;
    }

    const buildText = (stat: Statistic) => {
      return `${(100 * (stat?.value || 0)).toFixed(0)}% assisted`;
    };

    // Pending fixing this issue (https://github.com/Alex-At-Home/cbb-on-off-analyzer/issues/142),
    // just filter out any teams that suffer from it (All women teams and a few men's teams)
    const workaroundTempoBug =
      teamSeasonLookup &&
      ((_.startsWith(teamSeasonLookup, "Women_") &&
        (teamSeasonLookup || "0000").substring(0, 4) < "2020") ||
        teamSeasonLookup == "Men_West Virginia_2018/9" ||
        teamSeasonLookup == "Men_Florida St._2018/9" ||
        teamSeasonLookup == "Men_George Washington_2018/9" ||
        teamSeasonLookup == "Men_Kansas St._2018/9" ||
        teamSeasonLookup == "Men_NC State_2018/9" ||
        teamSeasonLookup == "Men_Oklahoma St._2018/9" ||
        teamSeasonLookup == "Men_South Carolina_2018/9" ||
        teamSeasonLookup == "Men_Tennessee_2018/9" ||
        teamSeasonLookup == "Men_Utah St._2018/9" ||
        teamSeasonLookup == "Men_Florida_2019/20" ||
        teamSeasonLookup == "Men_Missouri_2019/20");

    // Handle adding and removing of extra info:
    if (expandedView) {
      if (statSet.off_2primr) {
        delete statSet.off_2primr.extraInfo;
      }
      if (statSet.off_2pmidr) {
        delete statSet.off_2pmidr.extraInfo;
      }
      if (statSet.off_3pr) {
        delete statSet.off_3pr.extraInfo;
      }
    } else {
      if (statSet.off_2primr) {
        statSet.off_2primr.extraInfo = (
          <span>{buildText(statSet.off_2prim_ast)}</span>
        );
      }
      if (statSet.off_2pmidr) {
        statSet.off_2pmidr.extraInfo = (
          <span>{buildText(statSet.off_2pmid_ast)}</span>
        );
      }
      if (statSet.off_3pr) {
        statSet.off_3pr.extraInfo = (
          <span>{buildText(statSet.off_3p_ast)}</span>
        );
      }
    }
    if (!playerView) {
      // team/lineup views have both offense and defense
      if (statSet.off_ppp) {
        statSet.off_ppp.extraInfo = playCategoryBuilder(statSet, "off");
      }
      if (statSet.def_ppp) {
        statSet.def_ppp.extraInfo = playCategoryBuilder(statSet, "def");
      }
      if (statSet.def_assist) {
        (statSet as TeamStatSet | LineupStatSet).def_assist.extraInfo =
          assistBuilder(statSet, "def");
      }
      if (statSet.def_2primr) {
        (statSet as TeamStatSet | LineupStatSet).def_2primr.extraInfo = (
          <span>{buildText(statSet.def_2prim_ast)}</span>
        );
      }
      if (statSet.def_2pmidr) {
        (statSet as TeamStatSet | LineupStatSet).def_2pmidr.extraInfo = (
          <span>{buildText(statSet.def_2pmid_ast)}</span>
        );
      }
      if (statSet.def_3pr) {
        (statSet as TeamStatSet | LineupStatSet).def_3pr.extraInfo = (
          <span>{buildText(statSet.def_3p_ast)}</span>
        );
      }
      if (statSet.off_poss) {
        //TODO: see https://github.com/Alex-At-Home/cbb-on-off-analyzer/issues/142
        if (workaroundTempoBug) {
          statSet.off_poss.extraInfo = (
            <i>
              (data not available for this team, contact me for more details)
            </i>
          );
        } else {
          statSet.off_poss.extraInfo = paceBuilder(statSet, false);
        }
      }
      // Defensive FT%: team/lineup/ only
      if (statSet.def_ftr) {
        statSet.def_ftr.extraInfo = (
          <span>FT: {(100 * (statSet.def_ft?.value || 0)).toFixed(1)}%</span>
        );
      }
      if (statSet.off_raw_net) {
        // Copy raw net as a small extra info in the defensive column
        (statSet as TeamEnrichment | LineupEnrichment).def_net = {
          ...statSet.off_raw_net,
          value: (
            <small
              style={CommonTableDefs.getTextShadow(
                statSet.off_raw_net,
                CbbColors.off_diff35_p100_redGreen
              )}
            >
              <i>{(statSet.off_raw_net?.value || 0).toFixed(1)}</i>
            </small>
          ),
        };
      }
      // Extra defensive info:
      if (statSet.def_stl || statSet.total_off_stl) {
        const mutableExtraStats = {} as PureStatSet;
        if (statSet.total_off_stl) {
          //(have raw numbers, recalculate)
          DerivedStatsUtils.injectExtraDefensiveStats(
            statSet,
            mutableExtraStats
          );
        } else {
          mutableExtraStats.def_stl = statSet.def_stl;
          mutableExtraStats.def_blk = statSet.def_blk;
          mutableExtraStats.def_to_nonstl = statSet.def_to_nonstl;
        }

        if (statSet.def_2prim && mutableExtraStats.def_blk) {
          statSet.def_2prim.extraInfo = (
            <span>
              Block:{" "}
              {(100 * (mutableExtraStats.def_blk?.value || 0)).toFixed(1)}%
            </span>
          );
        }
        if (
          statSet.def_to &&
          mutableExtraStats.def_stl &&
          mutableExtraStats.def_to_nonstl
        ) {
          statSet.def_to.extraInfo = (
            <span>
              Stl: {(100 * (mutableExtraStats.def_stl?.value || 0)).toFixed(1)}
              %
              <br />
              Non-Stl TO:{" "}
              {(100 * (mutableExtraStats.def_to_nonstl?.value || 0)).toFixed(1)}
              %
            </span>
          );
        }
      }
    } else {
      if (statSet.off_team_poss) {
        //TODO: see https://github.com/Alex-At-Home/cbb-on-off-analyzer/issues/142
        if (workaroundTempoBug) {
          statSet.off_team_poss.extraInfo = (
            <i>
              (data not available for this team, contact me for more details)
            </i>
          );
        } else {
          statSet.off_team_poss.extraInfo = paceBuilder(statSet, true);
        }
      }
      if (statSet.off_team_poss_pct) {
        //TODO: see https://github.com/Alex-At-Home/cbb-on-off-analyzer/issues/142
        if (workaroundTempoBug) {
          statSet.off_team_poss_pct.extraInfo = (
            <i>
              (data not available for this team, contact me for more details)
            </i>
          );
        } else {
          statSet.off_team_poss_pct.extraInfo = paceBuilder(statSet, true);
        }
      }
    }
    return statSet;
  }

  /** Mutates a lineup stat set in order to display raw pts (for smaller displays) */
  static turnPppIntoRawPts = (
    mutableLineup: LineupStatSet,
    overwritePpp: boolean,
    adjustForLuck: boolean
  ) => {
    const granularity = adjustForLuck ? 1 : 0;

    const rawOffPts =
      0.01 *
      (mutableLineup.off_ppp?.value || 0) *
      (mutableLineup.off_poss?.value || 0);
    const rawDefPts =
      0.01 *
      (mutableLineup.def_ppp?.value || 0) *
      (mutableLineup.def_poss?.value || 0);

    (mutableLineup as any).off_raw_pts = {
      ...mutableLineup.off_ppp,
      value: (
        <text
          style={CommonTableDefs.getTextShadow(
            mutableLineup.off_ppp,
            CbbColors.off_pp100
          )}
        >
          <i>{rawOffPts.toFixed(granularity)}</i>
        </text>
      ),
    };

    (mutableLineup as any).def_raw_pts = {
      ...mutableLineup.def_ppp,
      value: (
        <text
          style={CommonTableDefs.getTextShadow(
            mutableLineup.def_ppp,
            CbbColors.def_pp100
          )}
        >
          <i>{rawDefPts.toFixed(granularity)}</i>
        </text>
      ),
    };

    (mutableLineup.def_raw_net_pts as any) = {
      ...mutableLineup.off_raw_net,
      value: (
        <text
          style={CommonTableDefs.getTextShadow(
            mutableLineup.off_raw_net,
            CbbColors.off_diff35_p100_redGreen
          )}
        >
          <i>{(rawOffPts - rawDefPts).toFixed(granularity)}</i>
        </text>
      ),
    };
    if (overwritePpp) {
      mutableLineup.def_net = mutableLineup.def_raw_net_pts;
    }
  };
}
