// React imports:
import React, { useState, Fragment } from "react";

// Next imports:
import { NextPage } from "next";

import _ from "lodash";

// Bootstrap imports:

// Utils
import {
  PlayTypeUtils,
  SourceAssistInfo,
  TopLevelPlayType,
} from "../../utils/stats/PlayTypeUtils";
import { CommonTableDefs } from "../../utils/tables/CommonTableDefs";
import { CbbColors } from "../../utils/CbbColors";
import TeamPlayTypeDiagRadar from "../../components/diags/TeamPlayTypeDiagRadar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClock,
  faArrowAltCircleDown,
  faWindowRestore,
  faWindowClose,
} from "@fortawesome/free-regular-svg-icons";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import { CSVLink, CSVDownload } from "react-csv";

const targetSource = ["source", "target"];
const shotTypes = ["3p", "mid", "rim"];
const shotNameMap = { "3p": "3P", mid: "Mid", rim: "Rim" } as Record<
  string,
  string
>;
const shotMap = { "3p": "3p", rim: "2prim", mid: "2pmid" } as Record<
  string,
  string
>;

// Component imports
import GenericTable, {
  GenericTableOps,
  GenericTableColProps,
} from "../../components/GenericTable";
import {
  Statistic,
  IndivStatSet,
  TeamStatSet,
  RosterEntry,
} from "../StatModels";
import { DivisionStatsCache, GradeTableUtils } from "./GradeTableUtils";
import { RosterTableUtils } from "./RosterTableUtils";
import { RosterStatsModel } from "../../components/RosterStatsTable";
import { TeamStatsModel } from "../../components/TeamStatsTable";
import { TopLevelPlayAnalysis } from "../stats/PlayTypeUtils";
import { GradeUtils } from "../stats/GradeUtils";
import { RosterStatsByCode } from "../StatModels";

/** Encapsulates some of the logic used to build the diag visualiations in XxxPlayTypeDiags */
export class PlayTypeDiagUtils {
  // Couple of utils for decorating the background eFG
  private static buildInfoStat = (stat: Statistic) => (
    <span style={CommonTableDefs.getTextShadow(stat, CbbColors.off_eFG)}>
      <i>{(100 * (stat?.value || 0)).toFixed(1)}%</i>
    </span>
  );
  private static enrichExtraInfo = (stat: Statistic) => {
    if (stat.extraInfo) {
      stat.extraInfo = (
        <div>
          Example play types:
          <br />
          {(stat.extraInfo as string[]).map((ex: string, i: number) => (
            <li key={`ex${i}`}>{ex}</li>
          ))}
        </div>
      );
    }
    return stat;
  };
  static buildInfoRow = (
    statSet: SourceAssistInfo,
    maybeScoring?: IndivStatSet
  ) => {
    const enrichedMaybeScoring = _.thru(maybeScoring, (__) => {
      if (maybeScoring) {
        return _.mapKeys(maybeScoring, (valObj, key) => {
          const isNumericKey =
            !_.isNil(valObj.value) && !_.endsWith(key, "_to");
          if (isNumericKey) {
            //(remove - incorrectly formatted anyway - extra info)

            const possStat = (statSet as any)[key]?.value || 1;
            valObj.value = (0.01 * (valObj.value || 0)) / possStat;
            valObj.extraInfo = undefined;
          }
          return isNumericKey
            ? key.replace("_ast", "_ppp").replace("_sf", "_sf_ppp")
            : key;
        });
      } else {
        return {};
      }
    });

    return _.merge(
      _.mapValues(statSet, (valObj, key) => {
        // Decorate eFG
        if (valObj && key != "order") {
          return _.endsWith(key, "_efg")
            ? PlayTypeDiagUtils.buildInfoStat(valObj as Statistic)
            : PlayTypeDiagUtils.enrichExtraInfo(valObj as Statistic);
        } else return valObj;
      }),
      enrichedMaybeScoring
    );
  };

  // Build raw assist table:

  static rawAssistTableFields = (
    hasPlayers: boolean,
    teamTotals: boolean,
    playTypeMode: "scoring" | "usage",
    sourceOnlyMode: boolean = false
  ) => {
    const maybeScoring = playTypeMode == "scoring" ? "scoring" : "total";
    const rowMeans = hasPlayers
      ? "team-mate / positional role"
      : "positional role";
    const denomMeans = teamTotals
      ? `team ${maybeScoring} possessions`
      : `player ${maybeScoring} possessions + assists`;
    const descriptionEfg = `The season eFG% of this shot type / row (${rowMeans})`;
    const descriptionPpp = `The season pts-per-play (not including rebounds or turnovers) of this shot type / row (${rowMeans})`;
    return {
      title: GenericTableOps.addTitle(
        "",
        "",
        CommonTableDefs.singleLineRowSpanCalculator,
        "",
        GenericTableOps.htmlFormatter
      ),
      ..._.fromPairs(
        targetSource
          .filter((loc) => loc == "source" || !sourceOnlyMode)
          .flatMap((loc) => {
            const targetNotSource = loc == "target";
            const descriptionAst = targetNotSource
              ? `% of total assists to the specified row (${rowMeans}) for this shot type`
              : `% of ${denomMeans} of this shot type assisted BY the specified row (${rowMeans})`;

            return [
              [`sep${loc}`, GenericTableOps.addColSeparator(0.75)],
            ].concat(
              shotTypes
                .flatMap((key) => {
                  return [
                    [
                      `${loc}_${key}_ast`,
                      GenericTableOps.addPctCol(
                        `${shotNameMap[key]!}${
                          targetNotSource ? " AST%" : ""
                        } `,
                        descriptionAst,
                        CbbColors.varPicker(CbbColors.p_ast_breakdown)
                      ),
                    ],
                  ]
                    .concat(
                      targetNotSource
                        ? [
                            [
                              `${loc}_${key}_efg`,
                              GenericTableOps.addDataCol(
                                `eFG`,
                                descriptionEfg,
                                CbbColors.offOnlyPicker(
                                  CbbColors.alwaysWhite,
                                  CbbColors.alwaysWhite
                                ),
                                GenericTableOps.percentOrHtmlFormatter
                              ),
                            ],
                            [
                              `sep${loc}${key}`,
                              GenericTableOps.addColSeparator(0.125),
                            ],
                          ]
                        : []
                    )
                    .concat(
                      targetNotSource || !sourceOnlyMode
                        ? []
                        : [
                            [
                              `${loc}_${key}_ppp`,
                              GenericTableOps.addDataCol(
                                `PPP`,
                                descriptionPpp,
                                CbbColors.offOnlyPicker(
                                  CbbColors.alwaysWhite,
                                  CbbColors.alwaysWhite
                                ),
                                GenericTableOps.percentOrHtmlFormatter
                              ),
                            ],
                            [
                              `sep${loc}ppp${key}`,
                              GenericTableOps.addColSeparator(0.125),
                            ],
                          ]
                    );
                })
                .concat(
                  targetNotSource
                    ? []
                    : [
                        [
                          `source_sf`,
                          GenericTableOps.addPctCol(
                            `SF`,
                            `% of ${denomMeans} ending in a trip to the FT line`,
                            CbbColors.varPicker(CbbColors.p_ast_breakdown)
                          ),
                        ],
                        [`sep${loc}ast`, GenericTableOps.addColSeparator(0.25)],
                      ]
                )
                .concat(
                  targetNotSource || !sourceOnlyMode
                    ? []
                    : [
                        [
                          `${loc}_sf_ppp`,
                          GenericTableOps.addDataCol(
                            `PPP`,
                            descriptionPpp,
                            CbbColors.offOnlyPicker(
                              CbbColors.alwaysWhite,
                              CbbColors.alwaysWhite
                            ),
                            GenericTableOps.percentOrHtmlFormatter
                          ),
                        ],
                        [
                          `sep${loc}ppp_sf`,
                          GenericTableOps.addColSeparator(0.125),
                        ],
                      ]
                )
                .concat([
                  [
                    `target_ast`,
                    GenericTableOps.addPctCol(
                      `AST`,
                      `% of ${denomMeans} ending with an assist FOR the specified row (${rowMeans})`,
                      CbbColors.varPicker(CbbColors.p_ast_breakdown)
                    ),
                  ],
                ])
                .concat(
                  sourceOnlyMode
                    ? [
                        [
                          `source_to`,
                          GenericTableOps.addPctCol(
                            `TO%`,
                            `% of possessions from this position group ending in a TO`,
                            CbbColors.varPicker(CbbColors.p_ast_breakdown)
                          ),
                        ],
                      ]
                    : []
                )
            );
          })
      ),
    };
  };

  /** Builds a handy element for scoring usage / play types to toggle between baseline/on/off views */
  static buildQuickSwitchOptions = (
    title: string,
    quickSwitch: string | undefined,
    quickSwitchOptions: { title?: string }[] | undefined,
    setQuickSwitch: React.Dispatch<React.SetStateAction<string | undefined>>,
    quickSwitchTimer: NodeJS.Timer | undefined,
    setQuickSwitchTimer: (
      newQuickSwitchTimer: NodeJS.Timer | undefined
    ) => void,
    quickSwitchExtra?: "extra" | "diff" | undefined,
    quickSwitchExtraOptions?: ("extra" | "diff")[]
  ) => {
    const quickSwichDelim = ":|:";
    const timeTooltip = (
      <Tooltip id="timerTooltip">
        Sets off a 4s timer switching between the default breakdown and this one
      </Tooltip>
    );
    const rightArrowTooltip = (
      <Tooltip id="rightArrowTooltip">
        Shows a top/bottom comparison between the two data sets
      </Tooltip>
    );
    const cancelRightArrowTooltip = (
      <Tooltip id="rightArrowTooltip">Hides the top/bottom comparison</Tooltip>
    );
    const rightOrDownArrowBuilder = (
      t: string | undefined,
      singleRow: boolean
    ) => {
      if (quickSwitchExtra == "extra" && t == quickSwitch) {
        return (
          <OverlayTrigger placement="auto" overlay={cancelRightArrowTooltip}>
            <FontAwesomeIcon icon={faWindowClose} />
          </OverlayTrigger>
        );
      } else {
        return (
          <OverlayTrigger placement="auto" overlay={rightArrowTooltip}>
            <FontAwesomeIcon icon={faArrowAltCircleDown} />
          </OverlayTrigger>
        );
      }
    };
    const diffViewTooltip = (
      <Tooltip id="diffViewTooltip">
        Shows a differential view of the two data sets
      </Tooltip>
    );
    const cancelDiffViewTooltip = (
      <Tooltip id="diffViewTooltip">
        Cancels the differential view of the two data sets
      </Tooltip>
    );
    const diffViewBuilder = (t: string | undefined, singleRow: boolean) => {
      if (quickSwitchExtra == "diff" && t == quickSwitch) {
        return (
          <OverlayTrigger placement="auto" overlay={cancelDiffViewTooltip}>
            <FontAwesomeIcon icon={faWindowClose} />
          </OverlayTrigger>
        );
      } else {
        return (
          <OverlayTrigger placement="auto" overlay={diffViewTooltip}>
            <FontAwesomeIcon icon={faWindowRestore} />
          </OverlayTrigger>
        );
      }
    };
    const quickSwitchTimerLogic = (newQuickSwitch: string | undefined) => {
      if (quickSwitchTimer) {
        clearInterval(quickSwitchTimer);
      }
      if (quickSwitch) {
        setQuickSwitch(undefined);
      } else {
        setQuickSwitch(newQuickSwitch);
      }
      if (newQuickSwitch) {
        setQuickSwitchTimer(
          setInterval(() => {
            setQuickSwitch((curr) => (curr ? undefined : newQuickSwitch));
          }, 4000)
        );
      } else {
        setQuickSwitchTimer(undefined);
      }
    };
    const quickSwitchBuilder = _.map(
      quickSwitchTimer
        ? [{ title: `Cancel 4s timer` }]
        : quickSwitchOptions || [],
      (opt) => opt.title
    ).map((t, index) => {
      return (
        <span key={`quickSwitch-${index}`} style={{ whiteSpace: "nowrap" }}>
          [
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (!quickSwitchTimer) {
                setQuickSwitch(quickSwitch == t ? undefined : t); //(ie toggle)
              } else {
                quickSwitchTimerLogic(undefined);
              }
            }}
          >
            {t}
          </a>
          {quickSwitchTimer ? undefined : (
            <span>
              &nbsp;
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  quickSwitchTimerLogic(t);
                }}
              >
                <OverlayTrigger placement="auto" overlay={timeTooltip}>
                  <FontAwesomeIcon icon={faClock} />
                </OverlayTrigger>
                &nbsp;
              </a>
            </span>
          )}
          {quickSwitchTimer ? undefined : (
            <Fragment>
              {!_.includes(quickSwitchExtraOptions || [], "extra") ? null : (
                <span>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (quickSwitchExtra === "extra" && t === quickSwitch) {
                        setQuickSwitch(undefined);
                      } else {
                        setQuickSwitch(
                          quickSwitch == `${t}${quickSwichDelim}extra`
                            ? undefined
                            : `${t}${quickSwichDelim}extra`
                        );
                      }
                    }}
                  >
                    {rightOrDownArrowBuilder(t, true)}&nbsp;
                  </a>
                </span>
              )}
              {!_.includes(quickSwitchExtraOptions || [], "diff") ? null : (
                <span>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (quickSwitchExtra === "diff" && t === quickSwitch) {
                        setQuickSwitch(undefined);
                      } else {
                        setQuickSwitch(
                          quickSwitch == `${t}${quickSwichDelim}diff`
                            ? undefined
                            : `${t}${quickSwichDelim}diff`
                        );
                      }
                    }}
                  >
                    {diffViewBuilder(t, true)}&nbsp;
                  </a>
                </span>
              )}
            </Fragment>
          )}
          ]&nbsp;
        </span>
      );
    });
    return (
      <div>
        <span style={{ whiteSpace: "nowrap", display: "inline-block" }}>
          <b>Analysis: [{quickSwitchExtra ? title : quickSwitch || title}]</b>
        </span>
        {_.isEmpty(quickSwitchOptions) ? null : (
          <span style={{ whiteSpace: "nowrap" }}>
            &nbsp;|&nbsp;<i>quick-toggles:</i>&nbsp;
          </span>
        )}
        {_.isEmpty(quickSwitchOptions) ? null : quickSwitchBuilder}
      </div>
    );
  };

  /** Encapsulates the logic to build a play style table from either single game or season  */
  static buildTeamStyleBreakdown = (
    title: string,
    players: RosterStatsModel,
    teamStats: TeamStatsModel,
    avgEfficiency: number,
    grades: DivisionStatsCache,
    showHelp: boolean,
    singleGameMode: boolean,
    defensiveOverride?: TopLevelPlayAnalysis
  ) => {
    const rosterInfo = teamStats.global.roster || {};

    /** Largest sample of player stats, by player key - use for ORtg calcs */
    const globalRosterStatsByCode = RosterTableUtils.buildRosterTableByCode(
      players.global,
      rosterInfo,
      true //(injects positional info into the player stats, needed for play style analysis below)
    );

    const options = singleGameMode
      ? [
          {
            title: `${title} // Season Breakdown`,
            players: players.global,
            rosterStatsByCode: globalRosterStatsByCode,
            teamStats: teamStats.global,
            avgEfficiency,
            showGrades: "rank:Combo",
            showHelp,
            quickSwitchOverride: undefined,
            possCountToUse: teamStats.baseline.off_poss?.value,
          },
        ]
      : [];

    const playCountToUse =
      singleGameMode && teamStats.baseline.off_poss
        ? (teamStats.baseline.off_poss?.value || 0) +
          (teamStats.baseline.total_off_orb?.value || 0)
        : undefined;

    return (
      <div className="small">
        <TeamPlayTypeDiagRadar
          title={`${title} // ${
            defensiveOverride ? "" : singleGameMode ? "Game " : "Season "
          }Breakdown`}
          players={players.baseline}
          rosterStatsByCode={globalRosterStatsByCode}
          teamStats={teamStats.baseline}
          avgEfficiency={avgEfficiency}
          showGrades={"rank:Combo"}
          grades={grades}
          showHelp={showHelp}
          quickSwitchOptions={options}
          playCountToUse={playCountToUse}
          quickSwitchOverride={undefined}
          defensiveOverride={defensiveOverride}
          startWithRaw={singleGameMode}
        />
      </div>
    );
  };

  /** Encapsulates the logic to build a play style table from either single game or season -
   * like buildTeamStyleBreakdown but generates a JSON object instead of
   * TODO: need to do a better job of deduplicating the code
   */
  static buildTeamStyleBreakdownData = (
    nameTeamA: string,
    isTeamA: boolean,
    menuItemTeamB: string,
    players: RosterStatsModel,
    teamStats: TeamStatsModel,
    avgEfficiency: number,
    grades: DivisionStatsCache,
    singleGameMode: boolean,
    defensiveOverride?: TopLevelPlayAnalysis,
    rosterStatsByCodeOverride?: RosterStatsByCode
  ): Record<string, string | number>[] => {
    const globalRosterStatsByCode = _.thru(
      rosterStatsByCodeOverride,
      (override) => {
        if (override) {
          return override;
        } else {
          const rosterInfo = teamStats.global.roster || {};

          /** Largest sample of player stats, by player key - use for ORtg calcs */
          return RosterTableUtils.buildRosterTableByCode(
            players.global,
            rosterInfo,
            true //(injects positional info into the player stats, needed for play style analysis below)
          );
        }
      }
    );

    const playersIn = players.baseline;
    const teamStatsIn = teamStats.baseline;

    const gameInfo = PlayTypeDiagUtils.buildGameInfo(menuItemTeamB);

    // From here I've coped and pasted the data processing bits of TeamPlayTypeDiagRadar
    //TODO: dedup into shared modules

    const playCountToUse =
      singleGameMode && teamStats.baseline.off_poss
        ? (teamStats.baseline.off_poss?.value || 0) +
          (teamStats.baseline.total_off_orb?.value || 0)
        : undefined;

    const oppoDefAdj = defensiveOverride
      ? teamStatsIn.off_adj_opp?.value
      : teamStatsIn.def_adj_opp?.value;
    const sosAdjustment = avgEfficiency / (oppoDefAdj || avgEfficiency);

    const topLevelPlayTypeStyles =
      defensiveOverride ||
      PlayTypeUtils.buildTopLevelPlayStyles(
        playersIn,
        globalRosterStatsByCode,
        teamStatsIn
      );

    const { tierToUse } = GradeTableUtils.buildTeamTierInfo("rank:Combo", {
      comboTier: grades?.Combo,
      highTier: grades?.High,
      mediumTier: grades?.Medium,
      lowTier: grades?.Low,
    });
    const possFactor = _.isNumber(playCountToUse) ? playCountToUse / 100 : 1.0;

    const topLevelPlayTypeStylesPctile = tierToUse
      ? GradeUtils.getPlayStyleStats(
          topLevelPlayTypeStyles,
          tierToUse,
          undefined, //(SoS calc separately below)
          true
        )
      : undefined;

    const adjTopLevelPlayTypeStylesPctile = tierToUse
      ? GradeUtils.getPlayStyleStats(
          topLevelPlayTypeStyles,
          tierToUse,
          sosAdjustment,
          true
        )
      : undefined;

    const data = topLevelPlayTypeStylesPctile
      ? _.map(topLevelPlayTypeStylesPctile, (stat, playType) => {
          const rawVal = (
            topLevelPlayTypeStyles as Record<
              string,
              { possPct: Statistic; pts: Statistic }
            >
          )[playType];

          const rawPct = rawVal?.possPct?.value || 0;

          return {
            game_id: _.isEmpty(menuItemTeamB)
              ? `Sample ${nameTeamA}`
              : `${nameTeamA} ${menuItemTeamB}`,
            team: isTeamA ? nameTeamA : gameInfo?.teamB || "Unknown",
            opponent: !isTeamA
              ? nameTeamA
              : gameInfo?.teamB || menuItemTeamB || "Unknown",
            game_date: gameInfo?.dateStr || "Unknown",
            team_score: isTeamA
              ? gameInfo?.scoreTeamA || 0
              : gameInfo?.scoreTeamB || 0,
            opponent_score: !isTeamA
              ? gameInfo?.scoreTeamA || 0
              : gameInfo?.scoreTeamB || 0,
            play_type: PlayTypeDiagUtils.getPlayTypeName(playType),
            freq_per_100: rawPct * 100.0,
            freq_percentile:
              rawPct == 0 ? 0 : Math.min(100, (stat.possPct.value || 0) * 100),
            plays_per_game: rawPct * possFactor * 100.0,
            efficiency: rawVal?.pts?.value || 0,
            efficiency_percentile: Math.min(100, (stat.pts.value || 0) * 100),
            adj_efficiency: (rawVal?.pts?.value || 0) * sosAdjustment,
            adj_efficiency_percentile: Math.min(
              100,
              (adjTopLevelPlayTypeStylesPctile?.[playType as TopLevelPlayType]
                ?.pts?.value || 0) * 100.0
            ),
            opponent_def_adj: (oppoDefAdj || 0.0) * 0.01, //(all eff are per play)
            total_plays: playCountToUse || 100,
          };
        })
      : [];

    return data;
  };

  /** Translates from the internal model to the one I'm exposing to users */
  static getPlayTypeName = (name: string) => {
    if (name == "Put-Back") {
      return "Rebound & Scramble";
    } else if (name == "Backdoor Cut") {
      return "Perimeter Cut";
    } else if (name == "Post & Kick") {
      return "Inside Out";
    } else {
      return name;
    }
  };

  /** Not totally sold on this presentation, but give some handy insight into what the graph means */
  static readonly buildLegendText = (
    <div>
      <p>
        A quick guide to what the graph means, see help link for more details:
      </p>
      <p>
        The height of the bar chart is how common that play type is, as a
        percentile.
      </p>
      <p>
        The width of the bar chart indicates how often it's used in practice (eg
        an 100th %ile Pick and Pop is still way fewer plays than a 10th %ile
        Drive). Above 10% usage the width is constant but the outline thickness
        increases.
      </p>
      <p>
        The color of the bar chart is how efficient that play is, as a
        percentile.
      </p>
      <p>
        The numbers above the bar chart are the number of plays of this type /
        100, and how many points per play were scored.
      </p>
      <p>
        Similarly to width vs height - the color of the bar chart can be green
        for inefficient play types, eg 0.75pts/play is very inefficient but is
        50% percentile for Mid-Range!
      </p>
    </div>
  );

  /** Allows to switch bewteen adjusted and raw PPP numbers */
  static buildAdjustedVsRawControls = (
    sos: number,
    adjusted: boolean,
    callback: (useAdjusted: boolean) => void
  ) => {
    const maybeBold = (
      bold: boolean,
      r: React.ReactElement
    ): React.ReactElement => {
      if (bold) return <b>{r}</b>;
      else return r;
    };
    return (
      <span>
        {maybeBold(
          !adjusted,
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              callback(!adjusted);
            }}
          >
            Raw
          </a>
        )}{" "}
        /{" "}
        <OverlayTrigger
          placement="auto"
          overlay={(props: any) => (
            <Tooltip id={`ajd${sos}`} {...props}>
              Adjusted Pts/Play (SoS: x[{sos.toFixed(2)}])
            </Tooltip>
          )}
        >
          {maybeBold(
            adjusted,
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                callback(!adjusted);
              }}
            >
              Adj<sup>*</sup>
            </a>
          )}
        </OverlayTrigger>
      </span>
    );
  };

  /** Presents the above text as a tooltip */
  static buildLegend = (legendLabelName: string) => {
    const tooltip = (
      <Tooltip id="playTypeDiagLegend">
        {PlayTypeDiagUtils.buildLegendText}
      </Tooltip>
    );
    return (
      <span key={`quickSwitch-legend`} style={{ whiteSpace: "nowrap" }}>
        <OverlayTrigger placement="auto" overlay={tooltip}>
          <u>{legendLabelName}</u>
        </OverlayTrigger>
      </span>
    );
  };

  /** Convert from the menu string into game info - TODO dedup with MatchupFilter */
  static buildGameInfo = (
    menuItemStr: string
  ):
    | { teamB: string; dateStr: string; scoreTeamA: number; scoreTeamB: number }
    | undefined => {
    const regex = /^(?:@|vs)? *(.*) [(]([^)]*)[)]: *[WL] *(\d+)-(\d+).*$/;
    const regexResult = regex.exec(menuItemStr);
    if (regexResult && regexResult.length >= 3) {
      return {
        teamB: regexResult[1],
        dateStr: regexResult[2],
        scoreTeamA: parseInt(regexResult[3]),
        scoreTeamB: parseInt(regexResult[4]),
      };
    } else {
      return undefined;
    }
  };

  /** Builds a slightly back CSV download link, onClick has to set a useState
   * variable which is passed into data (don't forget to include the useState in any useMemos!)
   */
  static buildCsvDownload = (
    labelName: string,
    gameId: string,
    data: object[],
    onClick: () => void
  ) => {
    const filename =
      gameId.replace("@", "at").replaceAll(/[^a-zA-Z0-9]/g, "_") + ".csv";
    const tooltip = (
      <Tooltip id={filename}>Download the play-type data as CSV</Tooltip>
    );
    return (
      <OverlayTrigger placement="auto" overlay={tooltip}>
        <CSVLink
          filename={filename}
          data={data}
          asyncOnClick={true}
          onClick={onClick}
        >
          {labelName}
        </CSVLink>
      </OverlayTrigger>
    );
  };
}
