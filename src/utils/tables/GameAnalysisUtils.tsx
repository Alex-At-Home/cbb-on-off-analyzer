import { LineupStatsModel } from "../../components/LineupStatsTable";
import { RosterStatsModel } from "../../components/RosterStatsTable";
import { TeamStatsModel } from "../../components/TeamStatsTable";
import { CommonFilterParams, LuckParams } from "../FilterModels";
import { LineupTableUtils } from "./LineupTableUtils";
import { RosterTableUtils } from "./RosterTableUtils";
import { defaultRapmConfig, RapmInfo } from "../stats/RapmUtils";
import { TeamReportTableUtils } from "./TeamReportTableUtils";
import _ from "lodash";
import {
  IndivPosInfo,
  IndivStatSet,
  PlayerCode,
  PlayerId,
  PureStatSet,
} from "../StatModels";
import { LineupUtils, PlayerOnOffStats } from "../stats/LineupUtils";
import { faFilter } from "@fortawesome/free-solid-svg-icons";
import {
  LineupStintInfo,
  LineupStintTeamStats,
  LineupStintTeamStat,
  LineupStintTeamShot,
} from "../StatModels";

export type GameStatsCache = {
  playerInfo: Record<PlayerId, IndivStatSet>;
  positionInfo: Record<PlayerId, IndivPosInfo>;
  rapmInfo: RapmInfo | undefined;
};

/** Utils for performing analyses of single game stats */
export class GameAnalysisUtils {
  /** Prior makes up 66% of the result */
  static rapmPriorMode = 0.66;

  /** Fixed, regress as much as possible */
  static rapmRegressionMode = 1.0;

  /** Turns the ugly PlayerCode into something marginally less ugly
   * TODO: have a set of player codes and always add ".", also see LineupUtils.namePrettifier
   * it would be nice to unify the two
   */
  static namePrettifier = (name: PlayerCode): string => {
    if (name.length > 3) {
      return _.chain(name)
        .thru((n) => {
          // Step 1, tidy up end of names
          const endOfName = n.substring(3);
          return (
            n.substring(0, 3) +
            endOfName.replace(/([a-z]*)(?:([A-Z]|[-][A-Za-z]).*)/, "$1$2")
          );
        })
        .thru((n) => {
          //Step 2: tidy up hyphens
          const possibleHyphen = n.length - 2;
          if (n.charAt(possibleHyphen) == "-") {
            return (
              n.substring(0, possibleHyphen + 1) +
              n.charAt(possibleHyphen + 1).toUpperCase()
            );
          } else if (n.charAt(possibleHyphen + 1) == "-") {
            return n.substring(0, possibleHyphen + 1);
          } else return n;
        })
        .thru((n) => {
          // Step 3, add a "." between first and last names
          const char2 = n.charAt(1);
          if (char2.toUpperCase() == char2) {
            // eg ASurname -> A.Surname
            return n.substring(0, 1) + "." + n.substring(1);
          } else if (n.length < 9) {
            // AfSurname -> Af.Surname
            return n.substring(0, 2) + "." + n.substring(2);
          } else {
            // AfVerylongsurname -> A.Verylongsurname
            return n.substring(0, 1) + "." + n.substring(2);
          }
        })
        .value();
    } else return name; //(name too short to do anything)
  };

  /** For a given lineup set, calculate RAPM as quickly as possible */
  static buildGameRapmStats = (
    team: string,
    commonParams: CommonFilterParams,
    lineupStats: LineupStatsModel,
    teamStats: TeamStatsModel,
    rosterStats: RosterStatsModel,
    adjustForLuck: boolean,
    luckConfig: LuckParams,
    avgEfficiency: number,
    singleGameMode: Boolean = true, //(use a stricted regression strategy than over big samples)
  ): GameStatsCache => {
    if (!lineupStats.lineups) {
      return { playerInfo: {}, positionInfo: {}, rapmInfo: undefined };
    }
    const genderYearLookup = `${commonParams.gender}_${commonParams.year}`;
    const teamSeasonLookup = `${commonParams.gender}_${team}_${commonParams.year}`;
    const rosterStatsByCode = RosterTableUtils.buildRosterTableByCode(
      rosterStats.global || [],
      teamStats.global?.roster,
      false,
      teamSeasonLookup,
    );
    const playerInfo = LineupTableUtils.buildBaselinePlayerInfo(
      rosterStats.baseline!,
      rosterStatsByCode,
      teamStats.baseline!,
      avgEfficiency,
      adjustForLuck,
      luckConfig.base,
      {},
      {},
    );
    const positionInfo = LineupTableUtils.buildPositionPlayerMap(
      rosterStats.global,
      teamSeasonLookup,
    );
    const preRapmTableData = LineupTableUtils.buildEnrichedLineups(
      //(calcs for both luck and non-luck versions)
      lineupStats.lineups || [],
      teamStats.global,
      rosterStats.global,
      teamStats.baseline,
      //(the baseline vs on/off here doesn't make any practical difference)
      adjustForLuck,
      luckConfig.base,
      avgEfficiency,
      false,
      teamSeasonLookup,
      positionInfo,
      playerInfo,
    );
    const rapmInfo =
      TeamReportTableUtils.buildOrInjectRapm(
        preRapmTableData,
        playerInfo,
        adjustForLuck,
        avgEfficiency,
        genderYearLookup,
        undefined,
        {
          ...defaultRapmConfig,
          ...(singleGameMode
            ? {
                priorMode: GameAnalysisUtils.rapmPriorMode,
                fixedRegression: GameAnalysisUtils.rapmRegressionMode,
              }
            : {}),
        },
      ) ||
      ({
        enrichedPlayers: _.values(playerInfo).map((p) => ({
          playerId: p.key || "",
          playerCode: p.code || "",
          rapm: {
            off_adj_ppp: p.off_adj_rtg,
            def_adj_ppp: p.def_adj_rtg,
          },
        })),
      } as unknown as RapmInfo);

    return { playerInfo, positionInfo, rapmInfo };
  };

  private static fieldValExtractor = (field: string) => {
    return (p: PureStatSet | undefined) => {
      if (field[0] == "o" || field[0] == "d") {
        return p?.[field]?.value || 0;
      } else {
        return (
          (p?.[`off_${field}`]?.value || 0) - (p?.[`def_${field}`]?.value || 0)
        );
      }
    };
  };

  /** Builds format mm:ss  */
  static buildDurationStr = (min: number) => {
    return `${Math.floor(min).toFixed(0)}"${((min % 1) * 60)
      .toFixed(0)
      .padStart(2, "0")}`;
  };

  /** Build part of stint/clump lineup stat overlay */
  static renderStintStats = (
    stints: LineupStintInfo[],
    teamNotOppo: Boolean,
  ) => {
    const toStats = (stats: LineupStintTeamStats) =>
      stats as Record<string, LineupStintTeamStat>;
    const toShots = (stats: LineupStintTeamStats) =>
      stats as Record<string, LineupStintTeamShot>;
    const {
      _3pm,
      _3pa,
      _2pmidm,
      _2pmida,
      _2primm,
      _2prima,
      ftm,
      fta,
      assists,
      tos,
      orbs,
      drbs,
      stls,
      blks,
      fouls,
    } = _.transform(
      stints,
      (acc, stint) => {
        const info = teamNotOppo ? stint.team_stats : stint.opponent_stats;

        acc._3pm = acc._3pm + (toShots(info)?.fg_3p?.made?.total || 0);
        acc._3pa = acc._3pa + (toShots(info)?.fg_3p?.attempts?.total || 0);
        acc._2pmidm = acc._2pmidm + (toShots(info)?.fg_mid?.made?.total || 0);
        acc._2pmida =
          acc._2pmida + (toShots(info)?.fg_mid?.attempts?.total || 0);
        acc._2primm = acc._2primm + (toShots(info)?.fg_rim?.made?.total || 0);
        acc._2prima =
          acc._2prima + (toShots(info)?.fg_rim?.attempts?.total || 0);
        acc.ftm = acc.ftm + (toShots(info)?.ft?.made?.total || 0);
        acc.fta = acc.fta + (toShots(info)?.ft?.attempts?.total || 0);
        acc.assists = acc.assists + (toStats(info)?.assist?.total || 0);
        acc.tos = acc.tos + (toStats(info)?.to?.total || 0);
        acc.orbs = acc.orbs + (toStats(info)?.orb?.total || 0);
        acc.drbs = acc.drbs + (toStats(info)?.drb?.total || 0);
        acc.stls = acc.stls + (toStats(info)?.stl?.total || 0);
        acc.fouls = acc.fouls + (toStats(info)?.foul?.total || 0);
        acc.blks = acc.blks + (toStats(info)?.blk?.total || 0);
      },
      {
        _3pm: 0,
        _3pa: 0,
        _2pmidm: 0,
        _2pmida: 0,
        _2primm: 0,
        _2prima: 0,
        ftm: 0,
        fta: 0,
        assists: 0,
        tos: 0,
        orbs: 0,
        drbs: 0,
        stls: 0,
        blks: 0,
        fouls: 0,
      },
    );
    return (
      <div>
        <span>
          3P=[
          <b>
            {_3pm}/{_3pa}
          </b>
          ] mid=[
          <b>
            {_2pmidm}/{_2pmida}
          </b>
          ]
        </span>
        <br />
        <span>
          rim=[
          <b>
            {_2primm}/{_2prima}
          </b>
          ] FT=[
          <b>
            {ftm}/{fta}
          </b>
          ]
        </span>
        <br />
        <span>
          A:TO=[<b>{assists}</b>]:[<b>{tos}</b>] BLKs=[<b>{blks}</b>]
        </span>
        <br />
        <span>
          STLs=[<b>{stls}</b>] FLs=[<b>{fouls}</b>]
        </span>
        <br />
        <span>
          ORBs=[<b>{orbs}</b>] DRBs=[<b>{drbs}</b>]
        </span>
      </div>
    );
  };

  /** Gives a bunch of info about a player's performance in the game */
  static buildPlayerTooltipContents = (
    seriesId: string,
    stats: IndivStatSet,
    playerOnOffStats: PlayerOnOffStats,
    playerPosInfo: IndivPosInfo,
    seasonStats: Boolean = false,
    perGamePossIn: [number, number] | undefined = undefined,
    missingGameAdj: number = 1.0,
  ) => {
    const games = seasonStats
      ? _.size(
          LineupUtils.isGameInfoStatSet(stats.game_info)
            ? LineupUtils.getGameInfo(stats.game_info || {})
            : stats.game_info,
        ) || 1
      : 1;
    const perGamePoss = perGamePossIn ?? [1.0, 1.0];

    const net =
      (playerOnOffStats.rapm?.off_adj_ppp?.value || 0) -
      (playerOnOffStats.rapm?.def_adj_ppp?.value || 0);
    // Info needed for the performance breakdown
    const offPoss = stats.off_team_poss_pct?.value || 0;
    const defPoss = stats.def_team_poss_pct?.value || 0;
    const offImpact =
      (playerOnOffStats.rapm?.off_adj_ppp?.value || 0) *
      offPoss *
      missingGameAdj *
      perGamePoss[0];
    const defImpact =
      (playerOnOffStats.rapm?.def_adj_ppp?.value || 0) *
      defPoss *
      missingGameAdj *
      perGamePoss[1];
    const sgn = defImpact > 0 ? "-" : "+"; //(def value is reversed)
    const _3pa = stats.total_off_3p_attempts?.value || 0;
    const _3pm = stats.total_off_3p_made?.value || 0;
    const _2pmida = stats.total_off_2pmid_attempts?.value || 0;
    const _2pmidm = stats.total_off_2pmid_made?.value || 0;
    const _2prima = stats.total_off_2prim_attempts?.value || 0;
    const _2primm = stats.total_off_2prim_made?.value || 0;
    const fta = stats.total_off_fta?.value || 0;
    const ftm = stats.total_off_ftm?.value || 0;
    const assists = stats.total_off_assist?.value || 0;
    const tos = stats.total_off_to?.value || 0;
    const orbs = stats.total_off_orb?.value || 0;
    const drbs = stats.total_off_drb?.value || 0;
    const pts = 3 * _3pm + 2 * (_2pmidm + _2primm) + ftm;
    const trbs = orbs + drbs;

    const missedGames = Math.round(games * (missingGameAdj - 1));

    const perG = (n: number) => {
      return seasonStats && n != 0 ? (n / games).toFixed(1) : n.toFixed(0);
    };

    return (
      <span>
        <p className="label">
          <b>{`${stats?.key}`}</b>
          <br />
          <b>{`${seriesId}`}</b>
          <br />
          <i>
            {`#${stats?.roster?.number || "??"} `}
            {`${stats?.roster?.height || "?-?"} `}
            {`${playerPosInfo?.posClass || "??"}`}
          </i>
        </p>
        <p className="desc">
          {seasonStats ? (
            <span>
              <b>{(pts / games).toFixed(1)}</b> pts /{" "}
              <b>{(trbs / games).toFixed(1)}</b> RBs
            </span>
          ) : (
            <span>
              <b>{pts}</b> pt{pts == 1 ? "" : "s"} / <b>{trbs}</b> RB
              {trbs == 1 ? "" : "s"}{" "}
            </span>
          )}
          <br />
          <span>
            Impact{perGamePossIn ? <small> /G</small> : ""}:{" "}
            <b>{(offImpact - defImpact).toFixed(1)}</b>pts (
            <b>{offImpact.toFixed(1)}</b>
            {sgn}
            <b>{Math.abs(defImpact).toFixed(1)}</b>)
          </span>
          <br />
          <br />
          <span>
            Net RAPM: <b>{net.toFixed(1)}</b> pts/100
          </span>
          <br />
          <span>
            Off RAPM:{" "}
            <b>{(playerOnOffStats.rapm?.off_adj_ppp?.value || 0).toFixed(1)}</b>{" "}
            pts/100
          </span>
          <br />
          <span>
            Def RAPM:{" "}
            <b>{(playerOnOffStats.rapm?.def_adj_ppp?.value || 0).toFixed(1)}</b>{" "}
            pts/100
          </span>
          <br />
          <span>
            Off Rtg:{" "}
            <b>
              {GameAnalysisUtils.fieldValExtractor("off_rtg")(stats).toFixed(1)}
            </b>
          </span>
          <br />
          <span>
            Usage:{" "}
            <b>
              {(
                GameAnalysisUtils.fieldValExtractor("off_usage")(stats) * 100
              ).toFixed(1)}
            </b>
            %
          </span>
          <br />
          <span>
            Mpg:{" "}
            <b>
              {seasonStats
                ? ((stats.duration_mins?.value || 0) / games).toFixed(1)
                : (
                    GameAnalysisUtils.fieldValExtractor("off_team_poss_pct")(
                      stats,
                    ) * 40
                  ).toFixed(1)}
            </b>
          </span>
          <br />
          <br />
          <span>
            3P=[
            <b>
              {perG(_3pm)}/{perG(_3pa)}
            </b>
            ] mid=[
            <b>
              {perG(_2pmidm)}/{perG(_2pmida)}
            </b>
            ]
          </span>
          <br />
          <span>
            rim=[
            <b>
              {perG(_2primm)}/{perG(_2prima)}
            </b>
            ] FT=[
            <b>
              {perG(ftm)}/{perG(fta)}
            </b>
            ]
          </span>
          <br />
          <span>
            A:TO=[<b>{perG(assists)}</b>]:[<b>{perG(tos)}</b>]
          </span>
          <br />
          <span>
            ORBs=[<b>{perG(orbs)}</b>] DRBs=[<b>{perG(drbs)}</b>]
          </span>
          {missingGameAdj > 1 ? (
            <>
              <br />
              <br />
              <i
                style={{
                  maxWidth: "14em",
                  display: "inline-block",
                  lineHeight: 1.2,
                }}
              >
                (!) Player has missed {missedGames} game
                {missedGames > 1 ? "s" : ""}, rate stats shown are for games in
                which they appeared
              </i>
            </>
          ) : null}
          <br />
        </p>
      </span>
    );
  };
}
