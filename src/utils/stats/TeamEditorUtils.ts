import _ from "lodash";
import { AvailableTeams } from "../internal-data/AvailableTeams";
import {
  IndivStatSet,
  PureStatSet,
  RosterEntry,
  Statistic,
} from "../StatModels";
import { RatingUtils } from "./RatingUtils";
import { TransferModel } from "../LeaderboardUtils";
import { PositionUtils } from "./PositionUtils";
import {
  TeamEditorManualFixes,
  TeamEditorManualFixModel,
} from "./TeamEditorManualFixes";
import { DateUtils } from "../DateUtils";
import { getConfAdjustment } from "../public-data/ConferenceInfo";

/** Possibly ways we change projections */
type DiagCodes =
  | "fr_yearly_bonus"
  | "yearly_bonus"
  | "undersized_txfer_pen"
  | "general_txfer_pen"
  | "player_gravity_bonus"
  | "player_gravity_penalty"
  | "better_help_txfer_bonus"
  | "share_team_defense"
  | "incorp_prev_season"
  | "fr_regression"
  | "switch_usage_ortg_style"
  | "ortg_sos_delta"
  | "user_adjustment"
  | "average_usage"
  | "switch_usage_ortg_average"
  | "lack_of_playmaking_penalty"
  | "positional_penalty";

/** For a given stat/projection, how/why we changed it */
type TeamEditorDiagObject = { [K in DiagCodes]?: number };

/** Allow for different settings in the prediction model - these started out as hard coded where needed so
 * they are just getting moved across as needed
 */
type PredictionSettings = {
  /** If true then use usage*poss_count to decide how much of previous year's results to take into account
   * (the idea here is simply that a players actions are ~poss*actions, not just poss)
   */
  include_usage_in_off_regression: boolean;
  /** If defined, will increasingly mix in some off_adj_rtg with off_rapm as min% increases
   * (the idea here is that for higher minutes players, RAPM becomes less predictive because the "off" term is too small)
   */
  use_adj_rtg_if_high_poss_pct:
    | {
        min_poss_pct: number; // if the poss pct is > this start mixing in Adj Rtg
        max_adj_rtg_weight: number; // when poss pct is 100% mix in this much Adj Rtg (0 < x < 1)
      }
    | undefined;
  /** If true, picks the better of a player's dRAPM instead of newest as the main factor
   * (the idea here is that if you've played good defense before you're more likely to play it again)
   */
  pick_highest_def_rapm: boolean;
};

/** For a given player, a set of all the changes to their projection */
type TeamEditorDiags = {
  off_rtg: {
    good: TeamEditorDiagObject;
    ok: TeamEditorDiagObject;
    bad: TeamEditorDiagObject;
  };
  off_usage: {
    good: TeamEditorDiagObject;
    ok: TeamEditorDiagObject;
    bad: TeamEditorDiagObject;
  };
  off: {
    good: TeamEditorDiagObject;
    ok: TeamEditorDiagObject;
    bad: TeamEditorDiagObject;
  };
  def: {
    good: TeamEditorDiagObject;
    ok: TeamEditorDiagObject;
    bad: TeamEditorDiagObject;
  };
};

/** Used to clump together players of similar skill in a given team for minutes assignment */
type NetClump = {
  min: number;
  max: number;
  avg: number;
  prevMin: number;
  size: number;
  acc: number;
};

/** Different possible HS profiles used to build Fr projections */
export type Profiles =
  | "5*/Lotto"
  | "5*"
  | "5+4*s"
  | "4*/T40ish"
  | "4*"
  | "3.5*/T150ish"
  | "3*"
  | "3+2*s"
  | "2*"
  | "Auto"
  | "UR";

/** The overides */
export type PlayerEditModel = {
  name?: string; //this determines if the override is a player in their own right
  mins?: number;
  nil?: number;
  global_off_adj?: number;
  global_def_adj?: number;
  pause?: boolean;
  profile?: Profiles; //(see TeamRosterEditor for possible values)
  pos?: string; //(usual set of possible pos)
  height?: string; //(for handling the info from Fr who don't have roster entries)
  fromFrList?: boolean; //(comes from the Fr list, not added by user)
};

/** Encapsulates a projection for a player (possibly manually created), plus their actual results */
export type GoodBadOkTriple = {
  key: string;
  good: IndivStatSet;
  ok: IndivStatSet;
  bad: IndivStatSet;
  orig: IndivStatSet;
  prevYear?: IndivStatSet;
  diag?: TeamEditorDiags;
  nil?: number;
  actualResults?: IndivStatSet;
  isOnlyActualResults?: boolean;
  manualProfile?: PlayerEditModel; // created by hand
};

/** The output of the main procesing chain */
export type TeamEditorProcessingResults = {
  // Main results
  rosterGuards: Array<GoodBadOkTriple>;
  rosterGuardMins: number;
  maybeBenchGuard: GoodBadOkTriple | undefined;
  rosterWings: Array<GoodBadOkTriple>;
  rosterWingMins: number;
  maybeBenchWing: GoodBadOkTriple | undefined;
  rosterBigs: Array<GoodBadOkTriple>;
  rosterBigMins: number;
  maybeBenchBig: GoodBadOkTriple | undefined;

  //Lists of players needed for rendering
  basePlayersPlusHypos: Array<GoodBadOkTriple>; //The roster, minus deleted players, plus added hypos
  inSeasonPlayerResultsList: Array<GoodBadOkTriple> | undefined; // In-Season or Eval mode, what's actually going on
  actualResultsForReview: Array<GoodBadOkTriple>; // Eval mode,

  // Some other useful intermediates
  avgEff: number;
  teamSosDef: number;
  allDeletedPlayers: Record<string, string>; //(merged team and UI overrides)
  allOverrides: Record<string, PlayerEditModel>; //(merged player and UI overrides)
  unpausedOverrides: Record<string, PlayerEditModel>; //(active allOverrides)

  // Tracking transfers in and out for fun
  in_off: number;
  in_def: number;
  out_off: number;
  out_def: number;
  sr_off: number;
  sr_def: number;
  nba_off: number;
  nba_def: number;
  fr_net: number;
  dev_off: number;
  dev_def: number;
};

/** Data manipulation functions for the TeamEditorTable */
export class TeamEditorUtils {
  /** These are settings on which any leaderboards prior to 2024 were calculated */
  static readonly legacySettings: PredictionSettings = {
    include_usage_in_off_regression: false,
    use_adj_rtg_if_high_poss_pct: undefined,
    pick_highest_def_rapm: false,
    // Ideas:
    // - buff def RAPM for higher usage players who are projected to have lower usage
    // - smarter buffs/nerfs for defense for up-transfers (eg compare with their team average, apply that to "below average for team")
    // More complex:
    // - run a semi-"monte carlo" where players hit their ceilings/floors (should give upside/downside/depth bonuses)
    // - better "bench players" / "coaching factor" team type aspects
  };
  /** 2024 off-season calcs */
  static readonly settingsFor2024: PredictionSettings = {
    ...TeamEditorUtils.legacySettings,
    include_usage_in_off_regression: true,
    pick_highest_def_rapm: false, // (works really badly with better_help_txfer_bonus, need to tidy that up first)
  };
  /** Pick which settings to use based on year */
  static getSettingsToUse = (
    year: string,
    overrideSettings?: PredictionSettings
  ): PredictionSettings => {
    if (overrideSettings) {
      return overrideSettings;
    } else if (year < "2023") {
      //(year is one behind)
      return TeamEditorUtils.legacySettings;
    } else {
      return TeamEditorUtils.settingsFor2024;
    }
  };

  static readonly genericBenchUsage = 0.18;
  static readonly genericFrUsage = 0.18;

  static readonly benchGuardKey = "benchG";
  static readonly benchWingKey = "benchW";
  static readonly benchBigKey = "benchB";
  static isBenchKey = (key: String) =>
    key == TeamEditorUtils.benchGuardKey ||
    key == TeamEditorUtils.benchWingKey ||
    key == TeamEditorUtils.benchBigKey;

  // Model Parsing

  /** Has the user applied any overrides */
  static anyUserOverrides(model: PlayerEditModel) {
    return (
      !_.isNil(model.mins) ||
      !_.isNil(model.global_off_adj) ||
      !_.isNil(model.global_def_adj)
    );
  }

  /** Convert user overrides to a param string */
  static playerEditModelToUrlParams(
    key: string,
    model: PlayerEditModel
  ): string {
    const maybeMins = _.isNil(model.mins)
      ? undefined
      : `m@${model.mins.toFixed(1)}`;
    const maybeNil = _.isNil(model.nil)
      ? undefined
      : `n@${model.nil.toFixed(0)}`;
    const maybeOffAdj = _.isNil(model.global_off_adj)
      ? undefined
      : `go@${model.global_off_adj.toFixed(2)}`;
    const maybeDefAdj = _.isNil(model.global_def_adj)
      ? undefined
      : `gd@${model.global_def_adj.toFixed(2)}`;
    const maybePaused = _.isNil(model.pause)
      ? undefined
      : `p@${model.pause ? 1 : 0}`;
    const maybeProfile = _.isNil(model.profile)
      ? undefined
      : `b@${model.profile}`;
    const maybePos = _.isNil(model.pos) ? undefined : `P@${model.pos}`;
    const toWrite = [
      maybeMins,
      maybeNil,
      maybeOffAdj,
      maybeDefAdj,
      maybePaused,
      maybeProfile,
      maybePos,
    ].filter((s) => !_.isNil(s));
    return `${key}|${toWrite.join("|")}`;
  }

  /** Convert the stringified param into a map of player edit modes */
  static urlParamstoPlayerEditModels(
    urlParamFrag: string
  ): Record<string, PlayerEditModel> {
    return _.chain(urlParamFrag)
      .split(";")
      .map((frag) => {
        const fragFrags = frag.split("|");
        const key = fragFrags[0];
        return [
          key,
          _.transform(
            _.drop(fragFrags, 1),
            (acc, v) => {
              const vFrags = v.split("@");
              if (vFrags[0] == "m") {
                acc.mins = parseFloat(vFrags?.[1] || "");
              } else if (vFrags[0] == "n") {
                acc.nil = parseInt(vFrags?.[1] || "");
              } else if (vFrags[0] == "go") {
                acc.global_off_adj = parseFloat(vFrags?.[1] || "");
              } else if (vFrags[0] == "gd") {
                acc.global_def_adj = parseFloat(vFrags?.[1] || "");
              } else if (vFrags[0] == "p") {
                acc.pause = vFrags?.[1] == "1";
              } else if (vFrags[0] == "b") {
                acc.profile = vFrags?.[1] as Profiles | undefined;
              } else if (vFrags[0] == "P") {
                acc.pos = vFrags?.[1];
                acc.name = key; //(if this is set then must be an added player, so also set name)
              }
            },
            {} as PlayerEditModel
          ),
        ];
      })
      .fromPairs()
      .value();
  }

  static readonly diagCodeToString: Record<DiagCodes, string> = {
    fr_yearly_bonus: "Fr->Soph bonus",
    yearly_bonus: "Small year-on-year bonus",
    general_txfer_pen: "General transfer penalty",
    undersized_txfer_pen: "Undersized transfer penalty",
    player_gravity_bonus: "Player gravity bonus",
    player_gravity_penalty: "Player gravity penalty",
    better_help_txfer_bonus: "Better help defense bonus",
    share_team_defense: "Shared team defense",
    incorp_prev_season: "Incorporate previous seasons' stats",
    fr_regression: "Freshmen stats are prone to regression",
    switch_usage_ortg_style: "Trade usage for efficiency (style reasons)",
    user_adjustment: "User adjustment",
    average_usage: "Average usage across team",
    switch_usage_ortg_average:
      "Trade usage for efficiency (after averaging usage)",
    lack_of_playmaking_penalty:
      "Team penalty because there's a lack of playmaking",
    positional_penalty:
      "Penalty for playing at the wing as a frontcourt player",
    ortg_sos_delta: "Adjustment for defensive SoS",
  };

  /** Key for storing enough info to rebuild roster from source */
  static getKey(p: IndivStatSet, currTeam: string, currYear: string): string {
    if (currTeam == p.team && currYear == p.year) {
      return `${p.code}::`;
    } else if (currTeam == p.team) {
      return `${p.code}::${p.year}`;
    } else if (currYear == p.year) {
      return `${p.code}:${p.team}:`;
    } else {
      return `${p.code}:${p.team}:${p.year}`;
    }
  }

  //////////////////////////////////////////////////////////////////////////////

  // Data processing  - main processing pipeline

  static teamBuildingPipeline(
    gender: string,
    team: string,
    yearIn: string,
    playerListIn: Array<IndivStatSet>,
    teamStats: PureStatSet | undefined,
    transfers: Array<Record<string, TransferModel[]>>,
    offSeasonMode: boolean,
    evalMode: boolean,
    addedPlayersIn: Record<string, GoodBadOkTriple>,
    overridesIn: Record<string, PlayerEditModel>,
    deletedPlayersIn: Record<string, string>,
    disabledPlayersIn: Record<string, boolean>,
    superSeniorsBack: boolean,
    alwaysShowBench: boolean,
    avgEff: number,
    /** pass this in because we have to search it for transfers, so in leaderboard board (all teams at once) want to partition it */
    prevYearFrList: Record<string, TeamEditorManualFixModel>,
    settingsOverride?: PredictionSettings
  ): TeamEditorProcessingResults {
    const settings = TeamEditorUtils.getSettingsToUse(yearIn, settingsOverride);

    const specialCase = () => {
      // In "year==All" mode, if 5 players are present from the same selected team, then pick that as the base year
      const specialCaseKey = _.chain(addedPlayersIn)
        .filter((p) => p.orig.team == team)
        .map((p) => `${p.orig.year}_${p.orig.team}`)
        .countBy()
        .toPairs()
        .filter((countKey) => countKey[1] >= 5)
        .value()?.[0]?.[0];
      if (specialCaseKey) {
        return specialCaseKey.split("_")[0];
      } else {
        return yearIn;
      }
    };
    const year = yearIn == "All" && team != "" ? specialCase() : yearIn;

    // Some tidying up of the player list before we start any processing:

    const genderYearLookup = `${gender}_${year}`;
    const teamOverrides: TeamEditorManualFixModel = offSeasonMode //(the fixes only apply in off-season mode)
      ? TeamEditorManualFixes.fixes(genderYearLookup)[team] || {}
      : {};

    // Special case: if a player from the previous year went a code switch because of sibling shenanigans
    // then mutate player list to fix it so transfer lists are correctly applied in getBasePlayers
    const prevYear = DateUtils.getPrevYear(year);
    //(if the prev year was "Extra", it's a collection of years, so remove all but the most recent)
    const playerList =
      prevYear != "Extra"
        ? playerListIn
        : playerListIn.filter(
            (p) => p.year == DateUtils.lastExtraYear || p.year == year
          );
    const genderPrevYearLookup = `${gender}_${prevYear}`;
    const thisYearCodeSitches = teamOverrides.codeSwitch;
    const prevYearCodeSwitches =
      TeamEditorManualFixes.fixes(genderPrevYearLookup)[team]?.codeSwitch;
    if (thisYearCodeSitches || prevYearCodeSwitches) {
      playerList.forEach((p) => {
        if (p.team == team) {
          //(currently not supported for transfers, though should be trivial to add)
          const newCode =
            p.year == prevYear
              ? prevYearCodeSwitches?.[p.code || ""]
              : thisYearCodeSitches?.[p.code || ""];
          if (newCode) {
            //Diag:
            //console.log(`RENAMED player from year [${p.year}]: ${p.code} to ${newCode} [${team}]`)
            p.code = newCode; //(not ideal that it mutates this, but should always make things better?!)
          }
        }
      });
    }

    //////////////

    // Build lots of handy lists

    // (in in evalMode then playerList has the season following the prediction dataset - split it back out)
    const [rawTeamCorrectYear, rawTeamNextYear] = evalMode
      ? _.partition(playerList, (p) => (p.year || "") <= year)
      : [playerList, []];

    /** Get the base players for what actually transpired, just one year, no transfers, etc */
    const actualResultsForReview = (
      evalMode
        ? TeamEditorUtils.getBasePlayers(
            team,
            DateUtils.getNextYear(year),
            rawTeamNextYear,
            false,
            false,
            undefined,
            {},
            [],
            undefined
          ).list
        : []
    ).map((triple) => {
      triple.isOnlyActualResults = true; //(starts with true, we'll set to false as we merge with projected results)
      triple.actualResults = triple.orig;
      return triple;
    });
    // Alternative view of the same data
    const actualResultsCodeOrIdSet = _.fromPairs(
      _.flatMap(actualResultsForReview, (triple) => {
        return [
          [triple.orig.key || "", triple], //key-aka-id, for matching vs manually generated players
          [triple.orig.code || "", triple], //code for normal
        ];
      })
    );

    // In in-season mode we get a list of all players (ignore delete/disable lists since this is what actually happened)
    const inSeasonPlayerResultsList = offSeasonMode
      ? undefined
      : TeamEditorUtils.getBasePlayers(
          team,
          year,
          rawTeamCorrectYear,
          offSeasonMode,
          superSeniorsBack,
          teamOverrides.superSeniorsReturning,
          {},
          transfers,
          undefined
        ).list;

    const addedPlayers =
      year != yearIn || teamOverrides.superSeniorsReturning
        ? _.omit(
            addedPlayersIn,
            Array.from(teamOverrides.superSeniorsReturning || []).concat(
              year != yearIn
                ? (inSeasonPlayerResultsList || []).map((t) => t.key + year)
                : []
              //(we're in special case mode, note: key was calculated based on year not yearIn)
            )
          )
        : addedPlayersIn;

    const candidatePlayersList = offSeasonMode //(to avoid having to parse the very big players array multiple times)
      ? rawTeamCorrectYear
      : _.flatMap(inSeasonPlayerResultsList || [], (triple) => {
          return [triple.orig].concat(triple.prevYear ? [triple.prevYear] : []);
        });

    const allDeletedPlayers = _.merge(
      _.fromPairs((teamOverrides.leftTeam || []).map((p) => [p, `code:${p}`])),
      deletedPlayersIn
    );
    const {
      list: basePlayers,
      lastSeasonTeam,
      ...outInfo
    } = TeamEditorUtils.getBasePlayers(
      team,
      year,
      candidatePlayersList,
      offSeasonMode,
      superSeniorsBack,
      teamOverrides.superSeniorsReturning,
      allDeletedPlayers,
      transfers,
      undefined
    );
    const redshirtishFr =
      _.isEmpty(prevYearFrList) || _.isEmpty(candidatePlayersList)
        ? {}
        : TeamEditorUtils.addRedShirtishFreshmen(
            team,
            year,
            prevYearFrList,
            transfers,
            new Set(basePlayers.map((triple) => triple.orig.code || "")),
            allDeletedPlayers,
            teamOverrides.overrides || {}
          ); //(if base players is empty assume it's because we haven't loaded the data yet)

    // Merge team overrides and user overrides
    const allOverrides: Record<string, PlayerEditModel> = _.fromPairs(
      _.chain(teamOverrides.overrides || {})
        .toPairs()
        .filter(
          (keyVal) => !overridesIn[keyVal[0]] && !allDeletedPlayers[keyVal[0]]
        )
        .value()
        .concat(
          _.toPairs(redshirtishFr).filter(
            (keyVal) => !allDeletedPlayers[keyVal[0]]
          )
        )
        .concat(
          _.toPairs(overridesIn).map((keyVal) => {
            //(ugly complication: Fr/RS-Fr look like "hand added" players, but their key is a code, not a human readable name)
            const userOverride = keyVal[1];
            const maybeTeamOverrides = teamOverrides.overrides || {};
            const maybeFr: PlayerEditModel | undefined =
              maybeTeamOverrides[keyVal[0]] || redshirtishFr[keyVal[0]];
            if (maybeFr) {
              const teamVals = userOverride.pause
                ? maybeFr
                : {
                    // Always retrieve this metadata and overwrite:
                    name: maybeFr.name,
                    height: maybeFr.height,
                  };
              return [
                keyVal[0],
                {
                  ...userOverride,
                  ...teamVals, //(if paused this removes all any manual overrides)
                  fromFrList: !_.isNil(maybeFr.profile), //(otherwise it's my override for a non-Fr)
                },
              ];
            } else {
              return keyVal;
            }
          })
        )
    );

    const unpausedOverrides: Record<string, PlayerEditModel> = _.chain(
      allOverrides
    )
      .toPairs()
      .filter((keyVal) => !keyVal[1].pause)
      .map((keyVal) => {
        // More annoying Fr/RS-Fr complications. This is the map the UI uses to apply or not overrides
        // therefore we need to remove the global_off/def_adj if it's the same otherwise the display
        // makes it look like we've changed something when we haven't
        const maybeOverrides = teamOverrides.overrides || {};
        const maybeFr: PlayerEditModel | undefined =
          maybeOverrides[keyVal[0]] || redshirtishFr[keyVal[0]];
        if (maybeFr?.profile) {
          //(if not profile it's my override for a non-Fr)
          const userOverride = keyVal[1];

          const newGlobalOffAdj =
            maybeFr.global_off_adj != userOverride.global_off_adj
              ? userOverride.global_off_adj
              : undefined;
          const newGlobalDefAdj =
            maybeFr.global_def_adj != userOverride.global_def_adj
              ? userOverride.global_def_adj
              : undefined;

          return _.isNil(newGlobalOffAdj) || _.isNil(newGlobalDefAdj)
            ? [
                keyVal[0],
                {
                  ...userOverride,
                  global_off_adj: newGlobalOffAdj,
                  global_def_adj: newGlobalDefAdj,
                },
              ]
            : keyVal;
        } else return keyVal;
      })
      .fromPairs()
      .value();

    const basePlayersPlusHypos = _.uniqBy(
      basePlayers.concat(_.values(addedPlayers)).concat(
        _.chain(allOverrides)
          .toPairs()
          .filter((keyVal) => !_.isNil(keyVal[1].name))
          .map((keyVal) => {
            const code = keyVal[0];
            const o = keyVal[1];
            const netScoring = TeamEditorUtils.getBenchLevelScoringByProfile(
              o.profile
            );
            const offAdj = o.global_off_adj || 0;
            const defAdj = o.global_def_adj || 0;
            const indivStatSet = (adj: number) => {
              return {
                key: o.name,
                posClass: o.pos,
                off_adj_rapm: { value: offAdj + 0.5 * netScoring + adj },
                def_adj_rapm: { value: defAdj + -0.5 * netScoring - adj },
                off_team_poss_pct: { value: 0 },
              };
            };
            return {
              key: code,
              nil: o.nil,
              good: indivStatSet(TeamEditorUtils.optimisticBenchOrFr),
              bad: indivStatSet(-TeamEditorUtils.pessimisticBenchOrFr),
              ok: indivStatSet(0),
              orig: indivStatSet(0),
              manualProfile: o,
              diag: {
                off_rtg: { good: {}, bad: {}, ok: {} },
                off_usage: { good: {}, bad: {}, ok: {} },
                off: { good: {}, bad: {}, ok: {} },
                def: { good: {}, bad: {}, ok: {} },
              },
            } as GoodBadOkTriple;
          })
          .value()
      ),
      (t) => t.key
    ); // resolve all the duplicates, eg added by inferred

    if (evalMode)
      basePlayersPlusHypos.forEach((triple) => {
        const matchingActual = triple.manualProfile
          ? actualResultsCodeOrIdSet[triple.manualProfile.name || ""]
          : actualResultsCodeOrIdSet[triple.orig.code || ""];

        if (matchingActual) {
          triple.actualResults = matchingActual.orig;
          matchingActual.isOnlyActualResults = false; //(merged actual results and projections)
        }
      });

    // Get an idea of the team's bench level

    const prevSeasonBench = teamStats
      ? TeamEditorUtils.calcActualBenchProduction(
          teamStats,
          lastSeasonTeam.map((p) => {
            return {
              orig: p,
              //(these are just needed for typing)
              key: p.code,
              good: p,
              bad: p,
              ok: p,
            } as GoodBadOkTriple;
          }),
          avgEff
        )
      : undefined;

    const benchEstimates = [
      TeamEditorUtils.benchGuardKey,
      TeamEditorUtils.benchWingKey,
      TeamEditorUtils.benchBigKey,
    ].map((key) => {
      return TeamEditorUtils.buildBenchEfficiency(
        team,
        year,
        key,
        "N/A",
        "N/A",
        0.5,
        prevSeasonBench,
        unpausedOverrides
      ).ok;
    });

    //////////////

    // Most of the math occurs here:

    const [teamSosNet, teamSosOff, teamSosDef] = teamStats
      ? TeamEditorUtils.calcApproxTeamSoS(teamStats, avgEff)
      : TeamEditorUtils.calcApproxTeamSoSLegacy(
          basePlayers.filter((p) => p.orig.team == team).map((p) => p.orig),
          avgEff
        );

    const hasDeletedPlayersOrTransfersIn =
      !_.isEmpty(
        //(used to decide if we need to recalc all the minutes)
        _.omit(addedPlayers, _.keys(disabledPlayersIn)) // have added transfers in (and they aren't disabled)
      ) || !_.isEmpty(allDeletedPlayers); //(or have deleted players)

    TeamEditorUtils.calcAndInjectYearlyImprovement(
      basePlayersPlusHypos,
      team,
      year,
      teamSosOff,
      teamSosDef,
      avgEff,
      unpausedOverrides,
      offSeasonMode,
      benchEstimates,
      prevYearFrList,
      settings
    );
    TeamEditorUtils.calcAndInjectMinsAssignment(
      basePlayersPlusHypos,
      team,
      year,
      disabledPlayersIn,
      unpausedOverrides,
      hasDeletedPlayersOrTransfersIn,
      teamSosNet,
      avgEff,
      offSeasonMode,
      benchEstimates
    );
    if (offSeasonMode) {
      //(else not projecting, just describing)
      TeamEditorUtils.calcAdvancedAdjustments(
        basePlayersPlusHypos,
        team,
        year,
        disabledPlayersIn
      );
    }
    const inInfo = _.transform(
      basePlayersPlusHypos,
      (acc, p) => {
        const possPctOff = p.ok.off_team_poss_pct?.value || 0;
        const possPctDef = p.ok.def_team_poss_pct?.value || 0;
        if (p.orig.team && p.orig.team != team) {
          acc.in_off = acc.in_off + TeamEditorUtils.getOff(p.ok) * possPctOff;
          acc.in_def = acc.in_def + TeamEditorUtils.getDef(p.ok) * possPctDef;
          //Diag
          //if (team == "Team") console.log(`Arriving [${p.orig.code}][${p.orig.team}][${p.orig.year}]: [${acc.in_off.toFixed(2)}] [${acc.in_def.toFixed(2)}]`);
        } else if (p.manualProfile) {
          acc.fr_net =
            acc.fr_net +
            (TeamEditorUtils.getOff(p.ok) + TeamEditorUtils.getOff(p.ok)) *
              possPctOff;
        } else if (p.orig.team == team && p.orig.code) {
          // development
          const possActPctOff = p.orig.off_team_poss_pct?.value || 0;
          const possActPctDef = p.orig.def_team_poss_pct?.value || 0;
          acc.dev_off =
            acc.dev_off +
            (TeamEditorUtils.getOff(p.ok) * possPctOff -
              TeamEditorUtils.getOff(p.orig) * possActPctOff);
          acc.dev_def =
            acc.dev_def +
            (TeamEditorUtils.getDef(p.ok) * possPctDef -
              TeamEditorUtils.getDef(p.orig) * possActPctDef);
          //Diag
          // if (team == "Kansas") console.log(`Developing [${p.orig.code}][${p.orig.team}][${p.orig.year}] / ` +
          //    `off:[${TeamEditorUtils.getOff(p.ok).toFixed(2)}][${TeamEditorUtils.getOff(p.orig).toFixed(2)}] ` +
          //    `mins:[${possPctOff.toFixed(2)}][${possActPctOff.toFixed(2)}]: ` +
          //    `[${acc.dev_off.toFixed(2)}] [${acc.dev_def.toFixed(2)}]`);
        }
      },
      { in_off: 0, in_def: 0, fr_net: 0, dev_off: 0, dev_def: 0 }
    );

    //////////////

    // Summarize what's happened

    // (can't use minutes annoyingly because that jumps around too much as you filter/unfilter stuff)
    const sortedWithinPosGroup = (triple: GoodBadOkTriple) => {
      return (
        (evalMode && triple.isOnlyActualResults ? 10000 : 0) +
        PositionUtils.posClassToScore(triple.orig.posClass || "") -
        TeamEditorUtils.getNet(triple.ok)
      );
    };

    // In eval mode, now concat the actual players that we didn't match with
    const playerProjectionsPlusActual = basePlayersPlusHypos.concat(
      evalMode
        ? actualResultsForReview.filter((triple) => triple.isOnlyActualResults)
        : []
    );

    const rosterGuards = _.sortBy(
      playerProjectionsPlusActual.filter((triple) => {
        return (
          triple.orig.posClass == "PG" ||
          triple.orig.posClass == "s-PG" ||
          triple.orig.posClass == "CG"
        );
      }),
      sortedWithinPosGroup
    );
    const filteredRosterGuards = rosterGuards.filter(
      (triple) => !triple.isOnlyActualResults && !disabledPlayersIn[triple.key]
    );
    const rosterGuardMinsPreBench =
      _.sumBy(filteredRosterGuards, (p) => p.ok.off_team_poss_pct.value!) * 0.2;

    const rosterWings = _.sortBy(
      playerProjectionsPlusActual.filter((triple) => {
        return (
          triple.orig.posClass == "WG" ||
          triple.orig.posClass == "WF" ||
          triple.orig.posClass == "G?"
        );
      }),
      sortedWithinPosGroup
    );
    const filteredRosterWings = rosterWings.filter(
      (triple) => !triple.isOnlyActualResults && !disabledPlayersIn[triple.key]
    );
    const rosterWingMinsPreBench =
      _.sumBy(filteredRosterWings, (p) => p.ok.off_team_poss_pct.value!) * 0.2;

    const rosterBigs = _.sortBy(
      playerProjectionsPlusActual.filter((triple) => {
        return (
          triple.orig.posClass == "S-PF" ||
          triple.orig.posClass == "PF/C" ||
          triple.orig.posClass == "C" ||
          triple.orig.posClass == "F/C?"
        );
      }),
      sortedWithinPosGroup
    );
    const filteredRosterBigs = rosterBigs.filter(
      (triple) => !triple.isOnlyActualResults && !disabledPlayersIn[triple.key]
    );
    const rosterBigMinsPreBench =
      _.sumBy(filteredRosterBigs, (p) => p.ok.off_team_poss_pct.value!) * 0.2;

    //////////////

    // Build bench minutes:

    const [maybeBenchGuard, maybeBenchWing, maybeBenchBig] = _.isEmpty(
      basePlayersPlusHypos
    )
      ? [undefined, undefined, undefined]
      : TeamEditorUtils.getBenchMinutes(
          team,
          year,
          rosterGuardMinsPreBench,
          rosterWingMinsPreBench,
          rosterBigMinsPreBench,
          prevSeasonBench,
          unpausedOverrides,
          alwaysShowBench
        );
    const rosterGuardMins =
      rosterGuardMinsPreBench +
      0.2 * (maybeBenchGuard?.ok?.off_team_poss_pct?.value || 0);
    const rosterWingMins =
      rosterWingMinsPreBench +
      0.2 * (maybeBenchWing?.ok?.off_team_poss_pct?.value || 0);
    const rosterBigMins =
      rosterBigMinsPreBench +
      0.2 * (maybeBenchBig?.ok?.off_team_poss_pct?.value || 0);

    //////////////

    // NIL

    basePlayersPlusHypos.forEach((triple) => {
      // Calculate an NIL as 66% what they did last year, 33% what they are expected to accomplish this year
      if (!triple.manualProfile) {
        const transferringIn = _.endsWith(triple.key, "::::");
        triple.nil =
          0.66 *
            TeamEditorUtils.getReturningPlayerNil(
              triple.orig,
              transferringIn,
              true,
              triple.orig.roster
            ) +
          0.12 *
            TeamEditorUtils.getReturningPlayerNil(
              triple.ok,
              transferringIn,
              false,
              triple.orig.roster
            ) +
          0.11 *
            TeamEditorUtils.getReturningPlayerNil(
              triple.good,
              transferringIn,
              false,
              triple.orig.roster
            ) +
          0.11 *
            TeamEditorUtils.getReturningPlayerNil(
              triple.bad,
              transferringIn,
              false,
              triple.orig.roster
            );
      } else {
        //Fr
        triple.nil =
          0.34 *
            TeamEditorUtils.getReturningPlayerNil(triple.ok, false, false) +
          0.33 *
            TeamEditorUtils.getReturningPlayerNil(triple.good, false, false) +
          0.3 * TeamEditorUtils.getReturningPlayerNil(triple.bad, false, false);
      }
    });

    //////////////

    // Useful diag for comparing TeamEditorTable and OffseasonLeaderboardTable
    //console.log(`TEAM [${year}]: ${basePlayersPlusHypos.map(t => `${t.key}/${(t.ok as PureStatSet).off_adj_rapm?.value}/${t.ok.off_team_poss_pct.value}`)}`)

    return {
      rosterGuards,
      rosterGuardMins,
      maybeBenchGuard,
      rosterWings,
      rosterWingMins,
      maybeBenchWing,
      rosterBigs,
      rosterBigMins,
      maybeBenchBig,

      inSeasonPlayerResultsList,
      basePlayersPlusHypos,
      actualResultsForReview,

      avgEff,
      teamSosDef,
      allDeletedPlayers,
      allOverrides,
      unpausedOverrides,

      ...outInfo,
      ...inInfo,
    };
  }

  //TODO idea: for pessimistic mode (I think optimistic is optimistic enough?!) recalc the minutes using the worst case
  // RAPMs, which will allow the better players to take more minutes and hopefully narrow the gap with the normal

  //////////////////////////////////////////////////////////////////////////////

  // Data processing  - middle level

  //TODO: is there some way I can take walk-ons out the equation but use the roster info to list "guys that don't play much"
  // (ignoring anyone who isn't a Fr, will get rid of some of them, but not Fr walk-ons.... really need the *s)

  /** Handy utility to fill in all the details for addedPlayers (eg hypothetical transfers) */
  static fillInAddedPlayers(
    team: string,
    year: string,
    addedPlayersParam: string,
    playerList: IndivStatSet[],
    prevYearTransfers: Record<string, TransferModel[]>,
    offSeasonMode: boolean,
    superSeniorsBack: boolean
  ): Record<string, GoodBadOkTriple> {
    const playerTeamYear = (key: string) => {
      const frags = key.split(":");
      return [frags[0], frags[1] || team, frags[2] || year] as [
        string,
        string,
        string
      ];
    };
    const keyList = addedPlayersParam.split(";");
    const codeSet = new Set(keyList.map((k) => playerTeamYear(k)[0]));
    const maybeMatchingPlayers = _.filter(
      playerList,
      (p) => codeSet.has(p.code || "") && (p.year || "") <= year
    );
    const maybeMatchingPlayersByCode = _.groupBy(
      maybeMatchingPlayers,
      (p) => p.code
    );

    const firstAddedPlayers = _.chain(keyList)
      .flatMap((key) => {
        const [code, txferTeam, txferYear] = playerTeamYear(key);

        return TeamEditorUtils.getBasePlayers(
          team,
          year,
          maybeMatchingPlayersByCode[code] || [],
          offSeasonMode,
          superSeniorsBack,
          undefined,
          {},
          // Build a transfer set explicitly for this player
          [{ [code]: [{ f: txferTeam, t: team }] }, prevYearTransfers],
          txferYear
        ).list;
      })
      .map((triple) => [triple.key, triple])
      .fromPairs()
      .value();

    return firstAddedPlayers;
  }

  /** Pulls out the players from the designated team */
  static getBasePlayers(
    team: string,
    year: string,
    players: IndivStatSet[],
    offSeasonMode: boolean,
    includeSuperSeniors: boolean,
    superSeniorsReturning: Set<string> | undefined,
    mutableExcludeSet: Record<string, string>,
    transfers: Record<string, Array<TransferModel>>[],
    transferYearOverride: string | undefined
  ): {
    list: GoodBadOkTriple[];
    lastSeasonTeam: IndivStatSet[];
    out_off: number;
    out_def: number;
    sr_off: number;
    sr_def: number;
    nba_off: number;
    nba_def: number;
  } {
    if (year == "All" && !transferYearOverride) {
      // There's no benefit in showing N seasons of a given team, easier just to add them manually
      //TODO: once we have a set of "addedPlayers" set up, can infer year from the most common, eg if there's 5+ from the same year?
      return {
        list: [],
        lastSeasonTeam: [],
        out_off: 0,
        out_def: 0,
        sr_off: 0,
        sr_def: 0,
        nba_off: 0,
        nba_def: 0,
      };
    }

    const transfersThisYear = transfers[0] || {};
    const transfersLastYear = transfers[1] || {};
    const transfersOnly = transferYearOverride != undefined;

    const getMaybeDoubleTransfer = (code: string, maybeP: IndivStatSet) => {
      return _.find(
        //Transferred to Y 2 years ago then from Y to here (T say)
        // Example: transfers[0] = {p1: { f:X t:Y }}, transfers[1] = { p1: {f:X t:T }},
        // players: [ { code: p1, team: X }, { code: p1, team: Y } ]
        transfersLastYear[code] || [],
        (txfer) => {
          return (
            txfer.f == maybeP.team &&
            _.some(
              transfersThisYear[code] || [],
              (txfer2) => txfer.t == txfer2.f && txfer2.t == team
            )
          );
        }
      ); //(note the purpose of doubleTransfer is to match up last year's player with this year's triple)
    };

    const fromBaseRoster = _.transform(
      players,
      (acc, p) => {
        const possPctOff = p.off_team_poss_pct?.value || 0;
        const possPctDef = p.def_team_poss_pct?.value || 0;

        const yearAdj =
          year == "All" //(for building all star teams)
            ? p.year
            : transferYearOverride && year != transferYearOverride
            ? transferYearOverride
            : "";

        const isRightYear = transferYearOverride
          ? p.year == transferYearOverride
          : p.year == year;

        const code = p.code || "";
        const dupCode = code + yearAdj;
        const isTransfer = p.team != team;
        const key = isTransfer
          ? `${code}:${p.team}:${yearAdj}`
          : `${code}::${yearAdj}`;

        // Need to build last year's team as well so we can estimate the bench impact
        if (!isTransfer && isRightYear && !acc.lastSeasonDups[key]) {
          acc.lastSeasonDups[key] = true;
          acc.lastSeasonTeam = acc.lastSeasonTeam.concat([p]);
        }

        const wasOnTeam = !transfersOnly && !isTransfer;
        const transferringIn =
          (transfersOnly || offSeasonMode) &&
          _.some(
            transfersThisYear[code] || [],
            (txfer) => txfer.f == p.team && txfer.t == team
          );
        const isTransferringOut = _.some(
          transfersThisYear[code] || [],
          (p) => p.f == team
        );
        const isTransferringOutNba =
          isTransferringOut &&
          _.some(
            transfersThisYear[code] || [],
            (p) => p.f == team && p.t == "NBA"
          );
        const wasPlayerTxferLastYear = _.some(
          transfersLastYear[code] || [],
          (txfer) => txfer.f == p.team && txfer.t == team
        );

        const doubleTransfer = getMaybeDoubleTransfer(code, p); //(note this always implies transferringIn in practice)
        const notAgingOut =
          includeSuperSeniors ||
          p.roster?.year_class != "Sr" ||
          superSeniorsReturning?.has(key);
        const isNotLeaving =
          transferringIn ||
          !offSeasonMode ||
          (notAgingOut && !isTransferringOut);
        const onTeam = wasOnTeam || wasPlayerTxferLastYear;
        const notOnExcludeListMainCheck = !mutableExcludeSet[key];
        if (!notOnExcludeListMainCheck) {
          mutableExcludeSet[key] = p.key; //(fill this in with the name of the player for display purposes)
        }
        const notOnExcludeListTransferCheck = _.thru(
          wasPlayerTxferLastYear && notOnExcludeListMainCheck,
          (caseToCheck) => {
            // These players' key will be different (not ending ::) so we adjust and re-check
            if (caseToCheck) {
              const adjustedTransferKey = key.split(":")[0] + "::";
              return !mutableExcludeSet[adjustedTransferKey];
            } else {
              return true;
            }
          }
        );
        const notOnExcludeList =
          notOnExcludeListMainCheck && notOnExcludeListTransferCheck;

        if (wasOnTeam && isTransferringOut && p.year == year) {
          //(this year only)
          if (!acc.txferCountDups[key]) {
            if (isTransferringOutNba) {
              acc.nba_off =
                acc.nba_off + TeamEditorUtils.getOff(p) * possPctOff;
              acc.nba_def =
                acc.nba_def + TeamEditorUtils.getDef(p) * possPctDef;
              //Diag
              //if (team == "Team") console.log(`Leaving(NBA) [${p.code}][${p.year}]: [${acc.nba_off.toFixed(2)}] [${acc.nba_def.toFixed(2)}]`);
            } else {
              acc.out_off =
                acc.out_off + TeamEditorUtils.getOff(p) * possPctOff;
              acc.out_def =
                acc.out_def + TeamEditorUtils.getDef(p) * possPctDef;
              //Diag
              //if (team == "Team") console.log(`Leaving(Portal) [${p.code}][${p.year}]: [${acc.out_off.toFixed(2)}] [${acc.out_def.toFixed(2)}]`);
            }
            acc.txferCountDups[key] = true;
          }
        } else if (wasOnTeam && !notAgingOut && p.year == year) {
          if (!acc.txferCountDups[key]) {
            acc.sr_off = acc.sr_off + TeamEditorUtils.getOff(p) * possPctOff;
            acc.sr_def = acc.sr_def + TeamEditorUtils.getDef(p) * possPctDef;
            //Diag
            //if (team == "Team") console.log(`Leaving(Sr) [${p.code}][${p.year}]: [${acc.sr_off.toFixed(2)}] [${acc.sr_def.toFixed(2)}]`);
            acc.txferCountDups[key] = true;
          }
        } else if (
          wasOnTeam &&
          notAgingOut &&
          p.year == year &&
          !notOnExcludeList
        ) {
          // We treat players we put on the mutable exclude list as "NBA" (aka "Pro")
          acc.nba_off = acc.nba_off + TeamEditorUtils.getOff(p) * possPctOff;
          acc.nba_def = acc.nba_def + TeamEditorUtils.getDef(p) * possPctDef;
        }

        //Diagnostic:
        //if (((p.code == "PlayerCodeA") || (p.code == "PlayerCodeB")) && (p.team == "Team")) console.log(`y=[${year}] ${p.key}:${p.team}/${p.code}:${p.year} dbl=${doubleTransfer} txin=${transferringIn} onteam=${onTeam} !exc=${notOnExcludeList} !leaving=${isNotLeaving} right_yr=${isRightYear} dup=[${acc.dups[dupCode]}] [${transferYearOverride}]`)

        if ((doubleTransfer || transferringIn || onTeam) && notOnExcludeList) {
          if (isNotLeaving && isRightYear && !acc.dups[dupCode]) {
            acc.retVal = acc.retVal.concat([
              {
                key: key,
                good: _.clone(p),
                ok: _.clone(p),
                bad: _.clone(p),
                orig: p,
              },
            ]);
            acc.dups[dupCode] = true;
          } else if (notOnExcludeList && !isRightYear) {
            //(must be previous year)
            const lastYearKey = wasPlayerTxferLastYear
              ? `${code}::${yearAdj}`
              : doubleTransfer
              ? `${code}:${doubleTransfer.t || ""}:${yearAdj}`
              : key;

            acc.prevYears[lastYearKey] = p;
          } else if (!isNotLeaving) {
            // mark the dup so know we've seen this player when checking "unmatched prev years"
            acc.dups[dupCode] = true;
          }
        }
      },
      {
        retVal: [] as GoodBadOkTriple[],
        lastSeasonTeam: [] as IndivStatSet[],
        dups: {} as Record<string, boolean>,
        txferCountDups: {} as Record<string, boolean>,
        lastSeasonDups: {} as Record<string, boolean>,
        prevYears: {} as Record<string, IndivStatSet>,
        inAndLeaving: {} as Record<string, boolean>, //(not filled in because we can't account for early departures)
        out_off: 0,
        out_def: 0,
        nba_off: 0,
        nba_def: 0,
        sr_off: 0,
        sr_def: 0,
      }
    );

    const injectPrevYearsIntoBaseRoster: Array<GoodBadOkTriple> =
      fromBaseRoster.retVal
        .map((triple) => {
          const matchingPrevYear = fromBaseRoster.prevYears[triple.key];
          if (matchingPrevYear) {
            // remove from (unmatched) prevYears list
            delete fromBaseRoster.prevYears[triple.key];
          }
          return { ...triple, prevYear: matchingPrevYear };
        })
        .filter((triple) => {
          // Filter out players who were already super seniors, if in offSeasonMode (else this is descriptive)

          // If someone has transferred in this year then they can't have aged out even if my approx
          // year/class calcs think they have!
          const isTransferThisYear =
            triple.orig.team != team &&
            triple.orig.year == year &&
            !triple.key.includes("::"); //(team name might have changed - this should filter out this case)

          return (
            !offSeasonMode ||
            !triple.prevYear ||
            transferYearOverride ||
            isTransferThisYear ||
            triple.prevYear?.roster?.year_class != "Sr" ||
            superSeniorsReturning?.has(triple.key)
            //(manual override trumps that though - not the blanket includeSuperSeniors though. Or if adding players obv)
          );
        });

    // Now find players who aren't the right year:
    const unmatchedPrevYearsToAdd: Array<GoodBadOkTriple> = _.flatMap(
      fromBaseRoster.prevYears,
      (p, key) => {
        if (offSeasonMode) {
          //might still be playing this season
          const code = p.code || "";
          const yearClass = p.roster?.year_class || "??";

          // If they transferred in _this_ year then they are definitely playing
          const transferringIn =
            !mutableExcludeSet[key] &&
            (_.some(
              transfersThisYear[code] || [],
              (txfer) => txfer.f == p.team && txfer.t == team
            ) ||
              !_.isNil(getMaybeDoubleTransfer(code, p)));

          const left = fromBaseRoster.inAndLeaving[key] || false;
          const transferredOut =
            _.some(transfersLastYear[code] || [], (p) => p.f == team) ||
            _.some(transfersThisYear[code] || [], (p) => p.f == team);

          const transferringInLastYear =
            !left &&
            !transferredOut &&
            !mutableExcludeSet[key] &&
            _.some(
              transfersLastYear[code] || [],
              (txfer) => txfer.f == p.team && txfer.t == team
            ) &&
            (yearClass != "Sr" ||
              includeSuperSeniors ||
              superSeniorsReturning?.has(key));

          const keyFrags = key.split(":");
          const dupCode = keyFrags[0] + (keyFrags?.[2] || "");
          //(will check we haven't seen and discard this year's version of this player)

          // There could be other cases but it gets too hard to decide so we'll use superSeniorsReturning to
          // allow these players to be added by hand
          const wasInAndNotAgedOut =
            p.roster?.year_class == "Fr" ||
            p.roster?.year_class == "So" ||
            (includeSuperSeniors && p.roster?.year_class == "Jr") ||
            superSeniorsReturning?.has(key);

          const wasInProbablyStillIn = wasInAndNotAgedOut && !transferredOut;

          const transferredInDidntPlayLastYear =
            transferringIn || transferringInLastYear;

          //Diag:
          // if (!transferredInDidntPlayLastYear && wasInProbablyStillIn && !fromBaseRoster.dups[dupCode]) {
          //    console.log(`NOT AGED OUT: ${team} - ${key} ... ${p.key}`);
          // }

          // (inAndLeaving was defined as "(isOnTeam || wasPlayerTxferLastYear) && !isNotLeaving")
          return !fromBaseRoster.dups[dupCode] &&
            (transferredInDidntPlayLastYear || wasInProbablyStillIn)
            ? [
                {
                  key: key,
                  good: _.clone(p),
                  ok: _.clone(p),
                  bad: _.clone(p),
                  orig: p,
                },
              ]
            : [];
        } else {
          return [];
        }
      }
    );

    return {
      list: injectPrevYearsIntoBaseRoster.concat(unmatchedPrevYearsToAdd),
      lastSeasonTeam: fromBaseRoster.lastSeasonTeam,
      out_off: fromBaseRoster.out_off,
      out_def: fromBaseRoster.out_def,
      sr_off: fromBaseRoster.sr_off,
      sr_def: fromBaseRoster.sr_def,
      nba_off: fromBaseRoster.nba_off,
      nba_def: fromBaseRoster.nba_def,
    };
  }

  /** Add red-shirt-ish Fr, including transfers */
  static addRedShirtishFreshmen(
    team: string,
    year: string,
    prevYearFrList: Record<string, TeamEditorManualFixModel>, //(indexed by team)
    transfers: Record<string, Array<TransferModel>>[],
    dupCodes: Set<string>,
    deletedCodes: Record<string, string>,
    manualOverrides: Record<string, PlayerEditModel>
  ): Record<string, PlayerEditModel> {
    return _.chain(prevYearFrList)
      .flatMap((fr, frTeam) => {
        if (team == frTeam) {
          return _.flatMap(fr.overrides || {}, (info, key) => {
            // Previous season ... if you didn't play 1 season ago and didn't transfer
            if (
              !dupCodes.has(key) &&
              !deletedCodes[key] && //(key is code for inserted Fr)
              !dupCodes.has(`${key}::`) &&
              !deletedCodes[`${key}::`] && //(can occur with either key or code)
              !_.some(transfers[0]?.[key] || [], (p) => p.f == team)
            ) {
              return [[key, info]];
            } else {
              return [];
            }
          });
        } else {
          return _.flatMap(fr.overrides || {}, (info, key) => {
            // Transfers in
            if (
              !dupCodes.has(key) &&
              !deletedCodes[key] && //(key is code for inserted Fr)
              !dupCodes.has(`${key}::`) &&
              !deletedCodes[`${key}::`] && //(can occur with either key or code)
              _.some(transfers[0]?.[key] || [], (p) => p.t == team)
            ) {
              return [[key, info]];
            } else {
              return [];
            }
          });
        }
      })
      .filter((keyVal) => !manualOverrides[keyVal[0] as string])
      .fromPairs()
      .value();
  }

  /** For player leaderboard, estimate a player's value the following year */
  static approxTransferPrediction(
    player: IndivStatSet,
    destTeam: string | undefined,
    year: string,
    avgEff: number
  ): PureStatSet {
    const settings = TeamEditorUtils.getSettingsToUse(year);

    const rosterOfOne: GoodBadOkTriple[] = [
      {
        key: player.code || "",
        good: _.clone(player),
        ok: _.clone(player),
        bad: _.clone(player),
        orig: player,
      },
    ];

    //(just using Maryland as a "random solid high major")
    const fallbackTeam = player.team == "Maryland" ? "Oklahoma" : "Maryland";

    const benchEstimates = [
      TeamEditorUtils.benchGuardKey,
      TeamEditorUtils.benchWingKey,
      TeamEditorUtils.benchBigKey,
    ].map((key) => {
      return TeamEditorUtils.buildBenchEfficiency(
        destTeam || fallbackTeam,
        year,
        key,
        "N/A",
        "N/A",
        0.5,
        undefined,
        {}
      ).ok;
    });

    TeamEditorUtils.calcAndInjectYearlyImprovement(
      rosterOfOne,
      destTeam || fallbackTeam,
      year,
      107.0,
      98.0,
      avgEff, //(inject typical HM SoS)
      {},
      true,
      benchEstimates,
      {},
      settings
    );
    const okPrediction = rosterOfOne[0]!.ok;
    return {
      off_adj_rapm: okPrediction.off_adj_rapm as unknown as Statistic,
      def_adj_rapm: okPrediction.def_adj_rapm as unknown as Statistic,
      off_rtg: okPrediction.off_rtg,
      off_usage: okPrediction.off_usage,
    };
  }

  /** Give players their year-on-year improvement */
  static calcAndInjectYearlyImprovement(
    roster: GoodBadOkTriple[],
    team: string,
    year: string,
    teamSosOff: number,
    teamSosDef: number,
    avgEff: number,
    overrides: Record<string, PlayerEditModel>,
    offSeasonMode: boolean,
    benchEstimates: IndivStatSet[],
    prevYearFrList: Record<string, TeamEditorManualFixModel>, //(indexed by team)
    settings: PredictionSettings
  ) {
    /** Handy a util to make the diagnostics mode a bit more readable */
    const tidy = (inJson: TeamEditorDiagObject) => {
      const keys = _.keys(inJson) as DiagCodes[];
      keys.forEach((key) => {
        if (!inJson[key]) delete inJson[key];
      });
      return inJson;
    };

    const baseBenchDefense =
      -0.5 * TeamEditorUtils.getBenchLevelScoring(team, year);
    const benchDefence = _.chain(benchEstimates)
      .map((b) => {
        const def: Statistic = b.def_adj_rapm || {};
        return _.isNil(def.value)
          ? baseBenchDefense
          : Math.min(baseBenchDefense, def.value);
      })
      .min()
      .value();

    const calcBasicAdjustments = (
      basePlayer: IndivStatSet,
      basePlayerPrevYear: IndivStatSet | undefined,
      override: PlayerEditModel | undefined
    ) => {
      const isFr =
        basePlayer.roster?.year_class == "Fr" && _.isNil(basePlayerPrevYear); //(filter out "fake Freshmen")

      const avgOffBump = 0.6; //(1.5 ORtg + 1 usage - the bump for staying in the same team)
      const offClassMulti = isFr ? 2 : 1;

      // Calculate ORtg adjustment from delta projection: 0.2*((ORtg*(avgEff/teamSosDef) - avgEff)
      const offAdjToORtg = (offAdj: number) => {
        return 5 * offAdj * (teamSosDef / avgEff);
      };

      // Useuable for defense and offense
      const maybeLevelJump =
        basePlayer.team != team
          ? TeamEditorUtils.getJumpInLevel(basePlayer.team || "", team, year)
          : 0;

      // Offensive bonuses and penalties (+ == good)

      //(specific to transferring up as a shorter player)
      const defSosDeltaForTxfers =
        teamSosDef - (basePlayer.def_adj_opp?.value || avgEff - 4);
      const offLevelJump = _.isNil(maybeLevelJump)
        ? defSosDeltaForTxfers < -4
          ? 2
          : 0
        : maybeLevelJump;
      const offHeightPenaltyFactor =
        offLevelJump == 1 ? 0.5 : offLevelJump >= 2 ? 1.0 : 0;
      const offTxferUpPenalty =
        offHeightPenaltyFactor > 0
          ? -1 *
            offHeightPenaltyFactor *
            TeamEditorUtils.calcTxferUpHeightEffDrop(basePlayer)
          : 0;

      const generalTxferOffPenalty = basePlayer.team != team ? avgOffBump : 0; //(just the fact that you might not get quite the same off-season bump as a transfer)

      // Adj delta assumes the usage goes to good use, then RAPM adjusts off that. But maybe with a new team, the RAPM will
      const rapmVsAdjOffDelta =
        0.5 *
        (((basePlayer as PureStatSet).off_adj_rapm?.value || 0) -
          (basePlayer.off_adj_rtg?.value || 0));
      const rapmVsAdjOffDeltaGoodBonus =
        rapmVsAdjOffDelta < 0 ? Math.abs(rapmVsAdjOffDelta) : 0;
      //if they under-performed their rating then optimistically maybe on this team they will under-perform less
      const rapmVsAdjOffDeltaBadPenalty =
        rapmVsAdjOffDelta > 0 ? Math.abs(rapmVsAdjOffDelta) : 0;
      //if they over-performed their rating then optimistically maybe on this team they will out-perform less

      // Defensive bonuses and penalties (- == good)

      const avgDefBump = -0.6; //(just make the same as the offensive bump, I don't believe there is any data)
      const defClassMulti = isFr ? 2 : 0.5; //(I'm going to assert without evidence the Fr bump for defense is relatively bigger)

      //TODO: Want to do a better job of this, but for now we'll heavily limit how bad up-transfers defense can be
      //TODO: (I'd like to try to calculate some sort of baseline for last year's team and what's returning and use that)
      const offSosDeltaForTxfers =
        teamSosOff - (basePlayer.off_adj_opp?.value || avgEff + 4);
      const defLevelJump = _.isNil(maybeLevelJump)
        ? offSosDeltaForTxfers > 4
          ? 2
          : 0
        : maybeLevelJump;

      //(basically the idea here is that if a transfer gets taken by a high major, their defense probably isn't unplayably bad,
      // and if RAPM says it is, then it's likely a team-effect vs a player-effect)
      //(the lower the level player comes from, the worse they likely are)
      const minDefLevelJump = 1.5; //(below this, too close in level)
      const minDefAdj =
        defLevelJump >= minDefLevelJump //(1.5=0.625, 2=0.75, 2.5=0.875, 3+=1, etc)
          ? Math.min(
              1.0,
              0.625 + Math.max(defLevelJump - minDefLevelJump, 0) * 0.25
            )
          : 0;
      const minDef = benchDefence + minDefAdj;
      const currDef = TeamEditorUtils.getDef(basePlayer);
      const bonusHelpDef =
        defLevelJump >= minDefLevelJump //(1.5=0.375, 2=0.5, 2.5=0.625, 3+=0.75 etc)
          ? Math.min(
              0.875,
              0.375 + Math.max(defLevelJump - minDefLevelJump, 0) * 0.25
            )
          : 0;
      const adjustedCurrDef = currDef - bonusHelpDef; //(bonus help defense for players coming up from low majors)
      const defTxferUpBetterHelpBump =
        /**/ //TODO: ugh because this happens during basic, if the advanced improves the def significantly then this gets stupidly large
        defLevelJump >= minDefLevelJump
          ? Math.min(minDef, adjustedCurrDef) - currDef
          : 0;
      //(end ugly heuristic defense adjustment)

      const defHeightPenaltyFactor =
        defLevelJump == 1 ? 0.75 : defLevelJump >= 2 ? 1.0 : 0;
      const defTxferUpPenalty =
        defHeightPenaltyFactor > 0
          ? defHeightPenaltyFactor *
            TeamEditorUtils.calcTxferUpHeightEffDrop(basePlayer)
          : 0;

      const defTxferMulti = isFr ? 1 : 0.5; //(you get a bigger jump as a Fr, see defClassMulti)
      const generalTxferDefPenalty =
        basePlayer.team != team ? defTxferMulti * avgDefBump : 0; //(just the fact that you might not get quite the same off-season bump as a transfer)

      const yearlyBonusField: DiagCodes = isFr
        ? "fr_yearly_bonus"
        : "yearly_bonus";
      const diags: TeamEditorDiags = {
        // These are just for display
        off_rtg: {
          good: tidy({
            [yearlyBonusField]: 2 * offClassMulti * 1.5, //(TODO calc these better)
            user_adjustment: offAdjToORtg(override?.global_off_adj || 0),
            undersized_txfer_pen: offAdjToORtg(-0.5 * offTxferUpPenalty),
          }),
          ok: tidy({
            [yearlyBonusField]: offClassMulti * 1.5, //(TODO calc these better)
            user_adjustment: offAdjToORtg(override?.global_off_adj || 0),
            undersized_txfer_pen: offAdjToORtg(-0.75 * offTxferUpPenalty),
            general_txfer_pen: offAdjToORtg(-0.5 * generalTxferOffPenalty),
          }),
          bad: tidy({
            user_adjustment: offAdjToORtg(override?.global_off_adj || 0),
            undersized_txfer_pen: offAdjToORtg(-offTxferUpPenalty),
            general_txfer_pen: offAdjToORtg(-generalTxferOffPenalty),
          }),
        },
        off_usage: {
          good: tidy({
            [yearlyBonusField]: 2 * offClassMulti * 1,
          }),
          ok: tidy({
            [yearlyBonusField]: offClassMulti * 1,
          }),
          bad: tidy({}),
        },
        // These are the main fields
        off: {
          good: tidy({
            [yearlyBonusField]: 2 * offClassMulti * avgOffBump,
            undersized_txfer_pen: -0.5 * offTxferUpPenalty,
            player_gravity_bonus: rapmVsAdjOffDeltaGoodBonus,
            user_adjustment: override?.global_off_adj || 0,
          }),
          ok: tidy({
            [yearlyBonusField]: offClassMulti * avgOffBump,
            undersized_txfer_pen: -0.75 * offTxferUpPenalty,
            general_txfer_pen: -0.5 * generalTxferOffPenalty,
            user_adjustment: override?.global_off_adj || 0,
          }),
          bad: tidy({
            undersized_txfer_pen: -offTxferUpPenalty,
            general_txfer_pen: -generalTxferOffPenalty,
            player_gravity_penalty: -rapmVsAdjOffDeltaBadPenalty,
            user_adjustment: override?.global_off_adj || 0,
          }),
        },
        def: {
          good: tidy({
            [yearlyBonusField]: 2 * defClassMulti * avgDefBump,
            better_help_txfer_bonus: defTxferUpBetterHelpBump,
            undersized_txfer_pen: -0.5 * defTxferUpPenalty,
            user_adjustment: override?.global_def_adj || 0,
          }),
          ok: tidy({
            [yearlyBonusField]: defClassMulti * avgDefBump,
            better_help_txfer_bonus: defTxferUpBetterHelpBump,
            undersized_txfer_pen: -0.75 * defTxferUpPenalty,
            general_txfer_pen: -0.5 * generalTxferDefPenalty,
            user_adjustment: override?.global_def_adj || 0,
          }),
          bad: tidy({
            undersized_txfer_pen: -defTxferUpPenalty,
            general_txfer_pen: -generalTxferDefPenalty,
            user_adjustment: override?.global_def_adj || 0,
          }),
        },
      };
      return diags;
    };
    const applyFrRegression = (player: IndivStatSet) => {
      const netRegressTo = TeamEditorUtils.getAvFrProduction(
        team,
        player.year || ""
      );

      // If we know this player's rank then we regress to their expectation
      const [offNetRegressTo, defNetRegressTo] = TeamEditorUtils.getFrOffDef(
        prevYearFrList[team]?.overrides?.[(player.code as string) || ""]
      ) || [0.5 * netRegressTo, -0.5 * netRegressTo];

      const minRegression = 0.1; // at 30mpg+ (0.75%)
      const maxRegression = 0.5; // at 10mpg- (0.25%)
      const poss = Math.max(
        0.25,
        Math.min(0.75, player.off_team_poss_pct?.value || 0)
      );
      const regressionFactor =
        minRegression + 2 * (0.75 - poss) * (maxRegression - minRegression);

      const regressedOffRapm =
        (1 - regressionFactor) *
          ((player as PureStatSet).off_adj_rapm?.value || 0) +
        regressionFactor * offNetRegressTo;
      const regressedDefRapm =
        (1 - regressionFactor) *
          ((player as PureStatSet).def_adj_rapm?.value || 0) +
        regressionFactor * defNetRegressTo;

      // Only apply if "bad" (-ve off, +ve def), and only to ok(partial) + bad projections
      const deltaOffRapm = Math.min(
        0,
        regressedOffRapm - ((player as PureStatSet).off_adj_rapm?.value || 0)
      );
      const deltaDefRapm = Math.max(
        0,
        regressedDefRapm - ((player as PureStatSet).def_adj_rapm?.value || 0)
      );

      // Diagnostic
      // console.log(`[${player.key}]: reg=[${regressedOffRapm.toFixed(1)},${regressedDefRapm.toFixed(1)}], ` +
      //    `act=[${((player as PureStatSet).off_adj_rapm?.value || 0)},${((player as PureStatSet).def_adj_rapm?.value || 0)}] (${netRegressTo}), ` +
      //    `regressFactor=[${regressionFactor.toFixed(2)}] (adj_poss=[${poss.toFixed(2)}]]), actual deltas: off=[${deltaOffRapm.toFixed(2)}] def=[${deltaDefRapm.toFixed(2)}]`);

      return {
        off_rtg: { good: {}, bad: {}, ok: {} },
        off_usage: { good: {}, bad: {}, ok: {} },
        off: {
          good: {},
          ok: tidy({
            fr_regression: 0.5 * deltaOffRapm,
          }),
          bad: tidy({
            fr_regression: deltaOffRapm,
          }),
        },
        def: {
          good: {},
          ok: tidy({
            fr_regression: 0.5 * deltaDefRapm,
          }),
          bad: tidy({
            fr_regression: deltaDefRapm,
          }),
        },
      };
    };

    const lowVolumePossUpperThresh = 0.3; //(above this don't regress to bench bean)
    const shouldApplyRegression = (triple: GoodBadOkTriple, isFr: boolean) => {
      // (low volume Fr get the same low volume regression as other classes)
      return (
        (triple.prevYear && !isFr) ||
        (triple.orig.off_team_poss_pct?.value || 0) < lowVolumePossUpperThresh
      );
    };
    const applyRegression = (
      player: PureStatSet,
      prevYear: IndivStatSet | undefined,
      adjPrevYear: PureStatSet
    ) => {
      const possMaybeWeightedByUsage = (
        stats: PureStatSet | undefined,
        weight: number
      ) => {
        const unweightedPoss = (stats?.off_poss?.value || 0) * weight;
        const maybeWeighted = settings.include_usage_in_off_regression
          ? unweightedPoss * (stats?.off_usage?.value || 0)
          : unweightedPoss;
        return maybeWeighted;
      };
      const thisYearPossWeighted = possMaybeWeightedByUsage(player, 3); // 3:1
      const lastYearPossWeightedTmp = possMaybeWeightedByUsage(prevYear, 1);

      const lastYearPossWeighted = Math.min(
        lastYearPossWeightedTmp,
        0.4 * thisYearPossWeighted
      );
      //(as much weight as we'll allow last season)

      const thisYearDefSos = player.def_adj_opp?.value || teamSosDef;
      const lastYearDefSos = prevYear?.def_adj_opp?.value || teamSosDef;

      const thisYearNormalizer = teamSosDef / thisYearDefSos; //(scale, eg for x-team SoS)
      const lastYearNormalizer = 1.0; //(we've already scaled last year's to this team-year's)

      const totalWeightInv =
        1.0 / (thisYearPossWeighted + lastYearPossWeighted || 1);
      const thisYearWeight = thisYearPossWeighted * totalWeightInv;
      const lastYearWeight = lastYearPossWeighted * totalWeightInv;

      const defaultBenchLevelScoring = TeamEditorUtils.getBenchLevelScoring(
        team,
        year
      );
      // If we know this player's rank then we regress to their expectation
      const [offMaybeFrRegressTo, defMaybeFrRegressTo] =
        TeamEditorUtils.getFrOffDef(
          prevYearFrList[team]?.overrides?.[(player.code as string) || ""]
        ) || [0.5 * defaultBenchLevelScoring, -0.5 * defaultBenchLevelScoring];

      // Because they are low volume, they don't get the full Fr expectation (or they would have played more!)
      // (still this could be improved)
      const offRegressTo =
        0.25 * defaultBenchLevelScoring + 0.5 * offMaybeFrRegressTo;
      const defRegressTo =
        -0.25 * defaultBenchLevelScoring + 0.5 * defMaybeFrRegressTo;

      const highPossPct = lowVolumePossUpperThresh; //(above this don't regress)
      const lowPossPct = 0.125; //(at this point regressed all the way to 0)
      const lowVolumeRegression = (
        val: number,
        regressTo: number,
        isPrev: boolean
      ) => {
        const possPct =
          (isPrev ? prevYear : player)?.off_team_poss_pct?.value || 0;
        if (possPct < highPossPct) {
          const alpha =
            Math.max(0, possPct - lowPossPct) / (highPossPct - lowPossPct);

          // if (player.key == "XXX, YYY") console.log(`??? ${possPct} ${alpha} ${val} ${regressTo}` +
          // ` [${prevYearFrList[team]?.overrides?.[player.code as string]?.profile || "NR"}] ${thisYearWeight} - ${val*alpha + regressTo*(1.0 - alpha)}`)

          return val * alpha + regressTo * (1.0 - alpha);
        } else {
          return val;
        }
      };
      const offRtgCurrReg = (val: number) =>
        lowVolumeRegression(val, 100, false);
      const offCurrReg = (val: number, prevYear: boolean = false) =>
        lowVolumeRegression(val, offRegressTo, prevYear);
      const defCurrReg = (val: number, prevYear: boolean = false) =>
        lowVolumeRegression(val, defRegressTo, prevYear);

      const regressedORtg =
        thisYearWeight *
          offRtgCurrReg(player.off_rtg?.value || 0) *
          thisYearNormalizer +
        lastYearWeight * (adjPrevYear.off_rtg?.value || 0) * lastYearNormalizer;
      const regressedUsage =
        thisYearWeight * (player.off_usage?.value || 0) +
        lastYearWeight * (adjPrevYear.off_usage?.value || 0);

      const regressedOffRapm =
        thisYearWeight * offCurrReg(player.off_adj_rapm?.value || 0) +
        lastYearWeight * (adjPrevYear.off_adj_rapm?.value || 0); //TODO: why aren't these regressed?

      const regressedDefRapm = _.thru(
        settings.pick_highest_def_rapm,
        (orderedVsRecent) => {
          if (orderedVsRecent) {
            // We care more about whether a player has been good defensively than whether it was LY specifically
            const maxDefRapm = Math.min(
              //(use min not max because def is -ve)
              defCurrReg(player.def_adj_rapm?.value || 0),
              defCurrReg(adjPrevYear.def_adj_rapm?.value || 0, true)
            );
            const minDefRapm = Math.max(
              //(use max not min because def is -ve)
              defCurrReg(player.def_adj_rapm?.value || 0),
              defCurrReg(adjPrevYear.def_adj_rapm?.value || 0, true)
            );

            /**/
            // if (prevYear)
            //   console.log(
            //     `${player.key}: [${thisYearWeight}]*[${maxDefRapm}] + [${lastYearWeight}]*[${minDefRapm}]`
            //   );

            //TODO: these weights don't make much sense in this context, rethink
            return thisYearWeight * maxDefRapm + lastYearWeight * minDefRapm;
          } else {
            return (
              thisYearWeight * defCurrReg(player.def_adj_rapm?.value || 0) +
              lastYearWeight * (adjPrevYear.def_adj_rapm?.value || 0) //TODO: why aren't these regressed?
            );
          }
        }
      );

      const deltaORtg =
        regressedORtg - (player.off_rtg?.value || 0) * thisYearNormalizer; //(only incorporate the 2 if they were better)
      const deltaUsg = regressedUsage - (player.off_usage?.value || 0);
      const deltaOffRapm = regressedOffRapm - (player.off_adj_rapm?.value || 0);
      const deltaDefRapm = regressedDefRapm - (player.def_adj_rapm?.value || 0);
      const lastYearWasFr = prevYear?.roster?.year_class == "Fr";
      const isLowVolume =
        (player.off_team_poss_pct?.value || 0) < lowVolumePossUpperThresh; //(always apply as debuff)

      // Diagnostics
      //console.log(`[${player.key}]: ([${player.off_rtg?.value}]*[${thisYearWeight}] + [${adjPrevYear.off_rtg?.value}]*[${lastYearWeight}])`);

      return {
        off_rtg: {
          good: tidy({
            incorp_prev_season: deltaOffRapm > 0 || isLowVolume ? deltaORtg : 0, //if it's net (ortg+usg) good
          }),
          ok: tidy({
            incorp_prev_season:
              !lastYearWasFr || deltaOffRapm > 0 || isLowVolume ? deltaORtg : 0, //(for Fr - only if it's net (ortg+usg) good)
          }),
          bad: tidy({
            incorp_prev_season:
              !lastYearWasFr && deltaOffRapm < 0 ? deltaORtg : 0, //(only if it's net (ortg+usg) bad, not Fr)
          }),
        },
        off_usage: {
          good: tidy({
            incorp_prev_season:
              deltaOffRapm > 0 || isLowVolume ? deltaOffRapm : 0, //if it's net (ortg+usg) good
          }),
          ok: tidy({
            incorp_prev_season:
              !lastYearWasFr || deltaOffRapm > 0 || isLowVolume ? deltaUsg : 0, //(for Fr - only if it's net (ortg+usg) good)
          }),
          bad: tidy({
            incorp_prev_season:
              !lastYearWasFr && deltaOffRapm < 0 ? deltaUsg : 0, //(only if it's net (ortg+usg) bad, not Fr)
          }),
        },
        off: {
          good: tidy({
            incorp_prev_season:
              deltaOffRapm > 0 || isLowVolume ? deltaOffRapm : 0, //if it's good
          }),
          ok: tidy({
            incorp_prev_season:
              !lastYearWasFr || deltaOffRapm > 0 || isLowVolume
                ? deltaOffRapm
                : 0, //(for Fr - only if it's good)
          }),
          bad: tidy({
            incorp_prev_season:
              !lastYearWasFr && deltaOffRapm < 0 ? deltaOffRapm : 0, //(only if it's bad, not Fr)
          }),
        },
        def: {
          good: tidy({
            incorp_prev_season:
              deltaDefRapm > 0 || isLowVolume ? deltaDefRapm : 0, //if it's good
          }),
          ok: tidy({
            incorp_prev_season:
              !lastYearWasFr || deltaDefRapm > 0 || isLowVolume
                ? deltaDefRapm
                : 0, //(for Fr - only if it's good)
          }),
          bad: tidy({
            incorp_prev_season:
              !lastYearWasFr && deltaDefRapm < 0 ? deltaDefRapm : 0, //(only if it's bad, not Fr)
          }),
        },
      };
    };

    /** Balance ORtg and usage somewhat - this is really just for display */
    const balanceORtgAndUsage = (triple: GoodBadOkTriple) => {
      const player = triple.orig;
      const thisYearDefSos = player.def_adj_opp?.value || teamSosDef;
      const thisYearNormalizerInv = thisYearDefSos / teamSosDef; //(approx back to prev year's SoS)

      const handleScenario = (
        proj: "good" | "bad" | "ok",
        dataSource: PureStatSet
      ) => {
        const usageIn = dataSource.off_usage?.value || 0.2;
        const ortgIn = dataSource.off_rtg?.value || 0.2;
        // Diagnostics
        //console.log(`?? [${triple.key}][${proj}] - usg=${usage} rtg=${ortg}`);

        // if SoS increases, and this is negative, in practice players will be more selective, ie their usage
        // will decrease, not their ORtg, so we balance this as 3:1
        const deltaORtgFromSosDiff = ortgIn * (1.0 - thisYearNormalizerInv);
        const totalDeltaUsgFromSosDiff = 0.01 * deltaORtgFromSosDiff * 1.25;
        const deltaUsageToUse = Math.min(0, 0.75 * totalDeltaUsgFromSosDiff);
        const deltaORtgToUse =
          RatingUtils.adjustORtgForUsageDelta(
            ortgIn,
            usageIn,
            deltaUsageToUse
          ) - ortgIn;

        // Once we've sorted out a sensible ORtg/usg after messing with SoS, now we'll apply some other
        // scenarios

        const checkScenario = (ortg: number, usage: number) => {
          if (usage > 0.25 && ortg < 110) {
            // Scenario 1: Heavy usage (>25%), not superstar efficiency (ORtg < 110), try shot selection
            // aim for 24, assume we'll get 2/3rds of the way there
            const deltaUsage = -(usage - 0.24) * 0.66;
            const deltaORtg =
              RatingUtils.adjustORtgForUsageDelta(ortg, usage, deltaUsage) -
              ortg;
            // Diagnostics
            //console.log(`?? [${triple.key}][${proj}] - Delta usg=${deltaUsage} rtg=${deltaORtg}`);
            return [deltaORtg, deltaUsage];
          } else if (ortg < 90 && usage > 0.1) {
            // Scenario 2: Your ORtg is so bad that you'll lower your usage as low as it will go to get back to 90
            const deltaUsage = -(usage - 0.1) * 0.66;
            const deltaORtg =
              RatingUtils.adjustORtgForUsageDelta(ortg, usage, deltaUsage) -
              ortg;
            return [deltaORtg, deltaUsage];
          } else if (usage > 0.21 && usage < 0.25 && ortg < 98) {
            // Scenario 3: the search for 100!
            const deltaUsage = -(usage - 0.19) * 0.8; //(will go all the way down to 19)
            const deltaORtg =
              RatingUtils.adjustORtgForUsageDelta(ortg, usage, deltaUsage) -
              ortg;
            return [deltaORtg, deltaUsage];
          }
          return [0, 0];
        };
        const [preSosAdjOff, preSosAdjUsage] = checkScenario(
          ortgIn + deltaORtgToUse,
          usageIn + deltaUsageToUse
        );
        return [
          preSosAdjOff + deltaORtgToUse,
          preSosAdjUsage + deltaUsageToUse,
        ];
      };
      const [goodDeltaORtg, goodDeltaUsg] = handleScenario("good", triple.good);
      const [okDeltaORtg, okDeltaUsg] = handleScenario("ok", triple.ok);
      const [badDeltaORtg, badDeltaUsg] = handleScenario("bad", triple.bad);
      return {
        off_rtg: {
          good: tidy({
            switch_usage_ortg_style: goodDeltaORtg,
          }),
          ok: tidy({
            switch_usage_ortg_style: okDeltaORtg,
          }),
          bad: tidy({
            switch_usage_ortg_style: badDeltaORtg,
          }),
        },
        off_usage: {
          good: tidy({
            switch_usage_ortg_style: goodDeltaUsg * 100,
          }),
          ok: tidy({
            switch_usage_ortg_style: okDeltaUsg * 100,
          }),
          bad: tidy({
            switch_usage_ortg_style: badDeltaUsg * 100,
          }),
        },
        off: { good: {}, ok: {}, bad: {} },
        def: { good: {}, ok: {}, bad: {} },
      };
    };

    // Now apply the above rules

    /** Returns the SoS delta */
    const applyDiagsToBase = (
      proj: "good" | "bad" | "ok",
      diags: TeamEditorDiags,
      mutableTarget: PureStatSet,
      basePlayer: PureStatSet,
      applySosToAdj: boolean,
      filter: Set<DiagCodes> | undefined
    ): number => {
      // (These 2 are just for display)
      const thisYearDefSos = applySosToAdj
        ? basePlayer.def_adj_opp?.value || teamSosDef
        : teamSosDef; //(For ORtg, need to take SoS into account)
      const sumOffRtg = _.chain(diags.off_rtg[proj])
        .filter((value, key) => !filter || filter.has(key as DiagCodes))
        .sum()
        .value();
      const dummyForSosDelta = applySosToAdj
        ? TeamEditorUtils.addToVal(basePlayer.off_rtg, sumOffRtg, 1.0)
        : undefined;
      mutableTarget.off_rtg = TeamEditorUtils.addToVal(
        basePlayer.off_rtg,
        sumOffRtg,
        applySosToAdj ? teamSosDef / thisYearDefSos : 1.0
      )!;
      const sumOffUsage =
        0.01 *
        _.chain(diags.off_usage[proj])
          .filter((value, key) => !filter || filter.has(key as DiagCodes))
          .sum()
          .value();
      mutableTarget.off_usage = TeamEditorUtils.addToVal(
        basePlayer.off_usage,
        sumOffUsage
      )!;

      const sumOffAdj = _.chain(diags.off[proj])
        .filter((value, key) => !filter || filter.has(key as DiagCodes))
        .sum()
        .value();
      mutableTarget.off_adj_rtg = TeamEditorUtils.addToVal(
        basePlayer.off_adj_rtg,
        sumOffAdj
      )!;
      mutableTarget.off_adj_rapm = TeamEditorUtils.addToVal(
        basePlayer.off_adj_rapm,
        sumOffAdj
      )!;
      const sumDefAdj = _.chain(diags.def[proj])
        .filter((value, key) => !filter || filter.has(key as DiagCodes))
        .sum()
        .value();
      mutableTarget.def_adj_rtg = TeamEditorUtils.addToVal(
        basePlayer.def_adj_rtg,
        sumDefAdj
      )!;
      mutableTarget.def_adj_rapm = TeamEditorUtils.addToVal(
        basePlayer.def_adj_rapm,
        sumDefAdj
      )!;

      return dummyForSosDelta
        ? (mutableTarget.off_rtg?.value || 0) - (dummyForSosDelta?.value || 0)
        : 0;
    };

    roster
      .filter((t) => !t.manualProfile)
      .forEach((triple) => {
        // Calculate previous player improvement for regression
        const prevPlayerDiags = triple.prevYear
          ? calcBasicAdjustments(triple.prevYear, undefined, undefined)
          : undefined;
        const prevPlayerYearlyAdjustment = {};
        if (prevPlayerDiags && triple.prevYear && offSeasonMode) {
          applyDiagsToBase(
            "ok",
            prevPlayerDiags,
            prevPlayerYearlyAdjustment,
            triple.prevYear,
            true,
            new Set(["fr_yearly_bonus", "yearly_bonus"] as DiagCodes[])
          ); //(2 years' ago ORtg is now scaled to the "current team's last year SoS")
        }

        const isFr = triple.orig.roster?.year_class == "Fr"; //("fake Freshmen" already handled by 1st clause)

        const regressionDeltas = shouldApplyRegression(triple, isFr)
          ? applyRegression(
              triple.orig,
              triple.prevYear,
              prevPlayerYearlyAdjustment
            )
          : isFr
          ? applyFrRegression(triple.orig)
          : undefined;

        // Diagnostics
        //console.log(`[${triple.key}] ? [${triple.prevYear}]:  ${JSON.stringify(regressionDeltas)} AND ${JSON.stringify(prevPlayerYearlyAdjustment)}`);

        // Calculate other adjustments on top of the regressed data

        const maybeOverride = overrides[triple.key];
        const playerDiags = calcBasicAdjustments(
          triple.orig,
          triple.prevYear,
          maybeOverride
        );
        triple.diag =
          regressionDeltas && offSeasonMode
            ? _.merge(playerDiags, regressionDeltas)
            : playerDiags;
        (["good", "bad", "ok"] as ("good" | "bad" | "ok")[]).forEach((proj) => {
          const offSosDelta = applyDiagsToBase(
            proj,
            playerDiags,
            triple[proj],
            triple.orig,
            true,
            offSeasonMode ? undefined : new Set<DiagCodes>(["user_adjustment"])
          );
          if (triple.diag?.off_rtg && offSosDelta) {
            triple.diag.off_rtg[proj]["ortg_sos_delta"] = offSosDelta;
          }
        });
        // Now we have calculated the ORtg/usage corresponding to the RAPM, balance it to look better
        if (offSeasonMode) {
          const balanceORtgDiag = balanceORtgAndUsage(
            triple
          ) as TeamEditorDiags;
          (["good", "bad", "ok"] as ("good" | "bad" | "ok")[]).forEach(
            (proj) => {
              applyDiagsToBase(
                proj,
                balanceORtgDiag,
                triple[proj],
                triple[proj],
                false, // <- already applied the SoS factor
                new Set<DiagCodes>(["switch_usage_ortg_style"])
              );
            }
          );
          triple.diag = _.merge(triple.diag, balanceORtgDiag);
        }
      });
  }

  /** More advanced calculations that require the minutes adjustments */
  static calcAdvancedAdjustments(
    roster: GoodBadOkTriple[],
    team: string,
    year: string,
    disabledPlayers: Record<string, boolean>
  ) {
    // Team defense adjustments ... approx 3/10ths of defense is help defense not involving the player
    // so we'll average that out, but allow players to keep their individual impact, which we'll define as the delta
    // between def_rapm and def_adj_rtg.old_value (very approximate!)

    // ends up giving a team-wide 30% bonus/penalty to the average RAPM-adjusted defense delta

    const filteredRoster = roster.filter((p) => !disabledPlayers[p.key]);

    const shareTeamDefense = (proj: "good" | "bad" | "ok") => {
      const avDefense =
        0.2 *
        _.sumBy(filteredRoster, (p) => {
          const defToUse =
            (_.isNil((p[proj] as PureStatSet).def_adj_rapm?.value)
              ? p[proj].def_adj_rtg?.value
              : (p[proj] as PureStatSet).def_adj_rapm?.value) || 0;
          return defToUse * (p[proj].def_team_poss_pct?.value || 0);
        });

      filteredRoster
        .filter((t) => !t.manualProfile)
        .forEach((p) => {
          const defense =
            (_.isNil((p[proj] as PureStatSet).def_adj_rapm?.value)
              ? p[proj].def_adj_rtg?.value
              : (p[proj] as PureStatSet).def_adj_rapm?.value) || 0;
          const indivAdj =
            defense -
            ((!_.isNil(p[proj].def_adj_rtg?.old_value)
              ? p[proj].def_adj_rtg?.old_value
              : p[proj].def_adj_rtg?.value) || 0);
          const adjDefense =
            0.7 * (defense - indivAdj) + 0.3 * avDefense + indivAdj;
          const defAdjustment = adjDefense - defense;

          p[proj].def_adj_rtg = TeamEditorUtils.addToVal(
            (p[proj] as PureStatSet).def_adj_rtg,
            defAdjustment
          )!;
          p[proj].def_adj_rapm = TeamEditorUtils.addToVal(
            (p[proj] as PureStatSet).def_adj_rapm,
            defAdjustment
          );

          if (p.diag) {
            // More debugging:
            //console.log(`[${p.key}][${proj}]: def=[${defense.toFixed(3)}] indiv=[${indivAdj.toFixed(3)}] approx_team=[${(defense - indivAdj).toFixed(3)}] adjDef=[${adjDefense.toFixed(3)}]: delta=[${defAdjustment.toFixed(3)}] (av=[${avDefense.toFixed(3)}])`);

            p.diag.def[proj]["share_team_defense"] = defAdjustment;
          }
        });
    };

    const balanceUsage = (proj: "good" | "bad" | "ok") => {
      const usgInfo = _.transform(
        filteredRoster,
        (acc, triple) => {
          const indivStatSet = triple[proj] as PureStatSet;

          const mins = indivStatSet.off_team_poss_pct?.value || 0;
          const usg =
            indivStatSet.off_usage?.value || TeamEditorUtils.genericFrUsage; // (Fr-ish get a baseline of 0.18)
          acc.minUsgSum += mins * usg;
          acc.minSum += mins;

          // const tripleOk = (triple.ok as PureStatSet)
          // indivStatSet.off_adj_rapm = {  value: (indivStatSet.off_adj_rapm?.value || 0) - 0.25*1.58 }
        },
        { minUsgSum: 0, minSum: 0 }
      );

      const benchMins = Math.max(5 - usgInfo.minSum, 0);
      const totalMins = usgInfo.minSum + benchMins;
      const minUsgSumIncBench =
        usgInfo.minUsgSum + benchMins * TeamEditorUtils.genericBenchUsage;

      const weightedUsg = minUsgSumIncBench / totalMins;
      const deltaUsg = 0.2 - weightedUsg;
      //Debugging
      //console.log(`AVG_USG [${proj}] = ${weightedUsg.toFixed(4)} .. player_mins[${usgInfo.minSum.toFixed(2)}] total=[${totalMins}]`)

      const applyPlaymakingPenalty = proj != "good" && deltaUsg > 0;

      // In all cases want to fix the usg/org
      if (deltaUsg != 0)
        filteredRoster.forEach((triple) => {
          const indivStatSet = triple[proj] as PureStatSet;
          const oRtgAdjustment = applyPlaymakingPenalty ? -deltaUsg * 100 : 0;
          //Arbitrary: 1 pt of ORtg per player per % of usage below 20

          if (indivStatSet.off_usage) {
            // Don't have this info for Fr-ish
            const ortg = indivStatSet.off_rtg?.value || 100;
            const usage = indivStatSet.off_usage?.value || 0.2;
            const deltaORtg =
              RatingUtils.adjustORtgForUsageDelta(ortg, usage, deltaUsg) - ortg;

            indivStatSet.off_rtg = TeamEditorUtils.addToVal(
              indivStatSet.off_rtg,
              deltaORtg + oRtgAdjustment
            )!;
            indivStatSet.off_usage = TeamEditorUtils.addToVal(
              indivStatSet.off_usage,
              deltaUsg
            )!;

            if (triple.diag) {
              triple.diag.off_rtg[proj]["switch_usage_ortg_average"] =
                deltaORtg;
              triple.diag.off_usage[proj]["average_usage"] = deltaUsg;
              if (applyPlaymakingPenalty) {
                triple.diag.off_rtg[proj]["lack_of_playmaking_penalty"] =
                  oRtgAdjustment;
              }
            }
          }
          if (applyPlaymakingPenalty) {
            //Debugging"
            //console.log(`RAPM_adj [${proj}] = ${rapmAdjustment.toFixed(4)}`)
            const rapmAdjustment = oRtgAdjustment * 0.2;
            indivStatSet.off_adj_rtg = TeamEditorUtils.addToVal(
              indivStatSet.off_adj_rtg,
              rapmAdjustment
            )!;
            indivStatSet.off_adj_rapm = TeamEditorUtils.addToVal(
              indivStatSet.off_adj_rapm,
              rapmAdjustment
            )!;
            if (triple.diag) {
              triple.diag.off[proj]["lack_of_playmaking_penalty"] =
                rapmAdjustment;
            }
          }
        });
    };

    const positionalPenalty = (proj: "good" | "bad" | "ok") => {
      const isFrontCourt = (t: GoodBadOkTriple) =>
        t.orig.posClass == "C" ||
        t.orig.posClass == "PF/C" ||
        t.orig.posClass == "S-PF";
      const frontCourtLikePenalty = (t: GoodBadOkTriple) => {
        const pfNess = t.orig.posConfidences?.[3] || 0;
        const sgNess = t.orig.posConfidences?.[1] || 0;
        return Math.max(Math.min(pfNess - sgNess, 0.4), 0) * 0.75; //(to the eye test, 1x looked too punishing)
      };
      const sumFrontcourtishMins = _.sumBy(filteredRoster, (triple) => {
        const indivStatSet = triple[proj] as PureStatSet;
        const frontCourtness = isFrontCourt(triple)
          ? 1.0
          : frontCourtLikePenalty(triple);
        return frontCourtness * (indivStatSet.off_team_poss_pct.value || 0);
      });
      const deltaFrontCourtMins = sumFrontcourtishMins - 2.1; //(4 mins grace)
      if (deltaFrontCourtMins > 0) {
        // big penalty (-2) off and def for playing big men in skill positions, we're not in the 90s!
        const posPenaltyFactor =
          proj == "good" ? 0.75 : proj == "bad" ? 1.25 : 1.0;
        const offPenalty = -2.0 * deltaFrontCourtMins * 0.2 * posPenaltyFactor; //(divide by 5 since applying for the entire team)
        const defPenalty = 2.0 * deltaFrontCourtMins * 0.2 * posPenaltyFactor;

        // Diag
        //if (proj == "ok") console.log(`Position penalty: [${team}]: off=[${(5*offPenalty).toFixed(2)}] def=[${(5*defPenalty).toFixed(2)}] (min%=[${sumFrontcourtishMins.toFixed(2)}])`);

        filteredRoster.forEach((triple) => {
          //apply penalty across entire team
          const indivStatSet = triple[proj] as PureStatSet;
          indivStatSet.off_adj_rtg = TeamEditorUtils.addToVal(
            indivStatSet.off_adj_rtg,
            offPenalty
          )!;
          indivStatSet.off_adj_rapm = TeamEditorUtils.addToVal(
            indivStatSet.off_adj_rapm,
            offPenalty
          )!;
          indivStatSet.def_adj_rtg = TeamEditorUtils.addToVal(
            indivStatSet.def_adj_rtg,
            defPenalty
          )!;
          indivStatSet.def_adj_rapm = TeamEditorUtils.addToVal(
            indivStatSet.def_adj_rapm,
            defPenalty
          )!;
          if (triple.diag) {
            triple.diag.off[proj]["positional_penalty"] = offPenalty;
            triple.diag.def[proj]["positional_penalty"] = defPenalty;
          }
        });
      }
    };

    // Apply advanced:
    (["good", "ok", "bad"] as ("good" | "bad" | "ok")[]).forEach((proj) => {
      shareTeamDefense(proj);
      balanceUsage(proj);
      positionalPenalty(proj);
    });
  }

  /** Calculate minutes assignment, mutates roster */
  static calcAndInjectMinsAssignment(
    roster: GoodBadOkTriple[],
    team: string,
    year: string,
    disabledPlayers: Record<string, boolean>,
    overrides: Record<string, PlayerEditModel>,
    hasDeletedPlayersOrTransfersIn: boolean,
    teamSosNet: number,
    avgEff: number,
    offSeasonMode: boolean,
    benchEstimates: IndivStatSet[]
  ) {
    const getOffRapm = (s: PureStatSet) =>
      (s.off_adj_rapm || s.off_adj_rtg)?.value || 0;
    const getDefRapm = (s: PureStatSet) =>
      (s.def_adj_rapm || s.def_adj_rtg)?.value || 0;
    const getNetRapm = (s: PureStatSet) => getOffRapm(s) - getDefRapm(s);
    const getOffAdjRtg = (s: PureStatSet) => s.off_adj_rtg?.value || 0;
    const getMixedNet = (s: PureStatSet) => getOffAdjRtg(s) - getDefRapm(s);
    const getNet = (s: PureStatSet) => Math.max(getNetRapm(s), getMixedNet(s));

    const filteredRoster = roster.filter((p) => !disabledPlayers[p.key]);

    const benchProfileLevel = TeamEditorUtils.teamToProfileLevel(team, year);
    const benchLevelScoring = TeamEditorUtils.getBenchLevelScoring(team, year);
    const benchScoringEstimates = _.range(0, 3).map((keyIndex) => {
      return _.isNil(benchEstimates?.[keyIndex])
        ? benchLevelScoring
        : getNet(benchEstimates[keyIndex]);
    });
    const netRatings = _.orderBy(
      filteredRoster
        .map((p) => getNet(p.ok))
        .concat(
          benchScoringEstimates //(add one bench player per pos group)
        ),
      undefined,
      "desc"
    );

    const avgUpperTierNet = _.chain(netRatings).take(3).sum().value() / 3; // top 3 players
    const avgMidTierNet = _.chain(netRatings).drop(3).take(4).sum().value() / 4; // next 4 players
    const lowerTierSize = netRatings.length - 7; // (everyone else)
    const avgLowerTierNet =
      lowerTierSize > 0
        ? _.chain(netRatings).drop(7).sum().value() / lowerTierSize
        : _.sum(benchScoringEstimates) / 3;

    //(we use these to look for big jumps in rating that require minutes slashing on deep teams)
    const netClumps = _.transform(
      netRatings,
      (acc, net) => {
        const currClump = _.isEmpty(acc) ? undefined : acc[acc.length - 1];
        if (!currClump || currClump.min - net > 0.5) {
          // new clump
          const clumpAcc = (currClump?.acc || 0) + (currClump?.size || 0); //(how many players are in front)
          const prevMin = currClump ? currClump.min : net;
          acc.push({
            avg: net,
            min: net,
            max: net,
            size: 1,
            acc: clumpAcc,
            prevMin,
          });
        } else {
          // update existing clump
          currClump.min = net;
          currClump.avg =
            (currClump.size * currClump.avg + net) / (1 + currClump.size);
          currClump.size = currClump.size + 1;
        }
      },
      [] as Array<NetClump>
    );
    const top3rdNetClump =
      _.find(netClumps, (clump) => {
        return clump.acc < 3 && clump.acc + clump.size >= 3;
      }) || netClumps[1]!;

    const maxMinsPerKey = _.chain(filteredRoster)
      .map((p) => {
        const maybeOverride = overrides[p.key]?.mins;
        return [
          p.key,
          maybeOverride
            ? maybeOverride / 40.0
            : TeamEditorUtils.calcMaxMins(p, benchProfileLevel),
        ];
      })
      .fromPairs()
      .value();

    const minMinsPerKey = _.chain(filteredRoster)
      .map((p) => {
        const maybeOverride = overrides[p.key]?.mins;
        const minMins = maybeOverride
          ? maybeOverride / 40.0
          : TeamEditorUtils.calcMinMins(
              p,
              benchProfileLevel,
              team,
              teamSosNet,
              avgEff
            );
        return [p.key, Math.min(minMins, maxMinsPerKey[p.key] || minMins)]; //(prevent min>max)
      })
      .fromPairs()
      .value();

    const debugMode = false && !_.isEmpty(filteredRoster);
    if (debugMode) {
      // Diagnostics
      console.log(
        `NET CLUMPS: ${JSON.stringify(netClumps)} top3rd=[${JSON.stringify(
          top3rdNetClump
        )}]`
      );
      console.log(
        `NET TIERS: [${avgLowerTierNet.toFixed(1)}] - [${avgMidTierNet.toFixed(
          1
        )}] - [${avgUpperTierNet.toFixed(1)}] (SoS: [${teamSosNet.toFixed(3)}])`
      );
      _.keys(maxMinsPerKey).forEach((p) => {
        console.log(
          `${p}: [${(minMinsPerKey[p] || 0).toFixed(3)}] to [${(
            maxMinsPerKey[p] || 0
          ).toFixed(3)}]`
        );
      });
    }

    const assignMins = (
      newMins: number,
      p: GoodBadOkTriple,
      force: boolean = false
    ) => {
      const minMins = !_.isNil(minMinsPerKey[p.key])
        ? minMinsPerKey[p.key]
        : newMins;
      const maxMins = maxMinsPerKey[p.key] || newMins;
      const adjBaseMins: Statistic = {
        value: force ? newMins : Math.max(Math.min(newMins, maxMins), minMins),
      };
      p.good.off_team_poss_pct = adjBaseMins;
      p.good.def_team_poss_pct = adjBaseMins;
      p.ok.off_team_poss_pct = adjBaseMins;
      p.ok.def_team_poss_pct = adjBaseMins;
      p.bad.off_team_poss_pct = adjBaseMins;
      p.bad.def_team_poss_pct = adjBaseMins;
    };

    const somethingChangedBase =
      offSeasonMode ||
      !_.isEmpty(disabledPlayers) ||
      hasDeletedPlayersOrTransfersIn; // has transfers in or deleted players

    // In "in-season" mode, we try to leep the original minutes, but once the user starts editing all bets are off
    const somethingChanged =
      somethingChangedBase || // has transfers in or deleted players
      _.some(overrides, (o) => !o.pause); // has any overrides at all

    // First pass - calc minutes purely based on tier:
    filteredRoster.forEach((p) => {
      const hasMinsOverride = !_.isNil(overrides[p.key]?.mins);
      const calcMins = somethingChanged || hasMinsOverride; //(since overrides are enforced using min/max)

      const okNet = calcMins ? getNet(p.ok) : 0;
      const frFactor =
        calcMins && p.manualProfile?.profile
          ? 0.25 +
            Math.max(0, Math.min(0.75, (okNet - benchLevelScoring) * 0.5))
          : 1.0;
      //(for Fr we apply an additional penalty if they aren't significantly better than the bench scoring level)

      const baseMins = calcMins
        ? frFactor *
          (TeamEditorUtils.netClumpsToBaseMins(
            okNet,
            top3rdNetClump,
            netClumps
          ) ||
            TeamEditorUtils.netTierToBaseMins(okNet, [
              avgLowerTierNet,
              avgMidTierNet,
              avgUpperTierNet,
            ]))
        : p.orig.off_team_poss_pct?.value || 0; //(in-season mode, just described minutes played)
      if (debugMode) {
        // Diagnostics
        console.log(
          `[${p.key}]: base mins [${baseMins}] min=[${minMinsPerKey[
            p.key
          ]?.toFixed(1)}]/max=[${maxMinsPerKey[p.key]?.toFixed(1)}] ` +
            `from net=[${okNet.toFixed(1)}] frFactor=[${frFactor.toFixed(2)}][${
              p.manualProfile?.profile
            }] bench=[${benchLevelScoring.toFixed(1)}]`
        );
      }
      assignMins(baseMins, p, !calcMins);
    });

    // We want the total to try to hit the range: 5*(35-39mpg), goal 37.5 if high, 36.5 if low and the rest will be picked up as bench minutes
    // (lower range is 25mpg of bench, upper range is 5mpg)
    // (for in-season, we bump a little further since we don't have the concept of "Fr ready to take their minutes")

    const allThreeBenchPosHaveOverriddenMins =
      _.chain(overrides)
        .pick([
          TeamEditorUtils.benchGuardKey,
          TeamEditorUtils.benchWingKey,
          TeamEditorUtils.benchBigKey,
        ])
        .filter((o) => !o.pause && !_.isNil(o.mins))
        .size()
        .value() == 3;

    // In "in-season" mode, until the user changes something we leave the minutes along
    const benchMinOverrides = _.chain(overrides)
      .pick(
        // add bench minutes override
        [
          TeamEditorUtils.benchGuardKey,
          TeamEditorUtils.benchWingKey,
          TeamEditorUtils.benchBigKey,
        ]
      )
      .values()
      .filter((o) => !o.pause)
      .sumBy((o) => (o.mins || 0) / 40)
      .value();

    const needToAdjBaseMinutes =
      somethingChangedBase ||
      benchMinOverrides > 0 ||
      _.some(filteredRoster, (p) => !_.isNil(overrides[p.key]?.mins)); // has overrides

    // Always reserve a few minutes for the deep bench
    const rosterSize =
      _.size(filteredRoster) + Math.ceil(benchMinOverrides / 15);
    const minsForBench = Math.max(0, 10 - rosterSize) * 5; //(we're not going to include walk-ons)

    const steps = needToAdjBaseMinutes ? [0, 1, 2, 3, 4, 5] : [];
    const finalStep = _.last(steps);
    const isFrontCourt = (t: GoodBadOkTriple) =>
      t.orig.posClass == "C" ||
      t.orig.posClass == "PF/C" ||
      t.orig.posClass == "S-PF";
    const maxFrontCourtMins = 2.1; // can't play front court positions outside of 4/5 (with small error bar)
    _.transform(steps, (acc, step) => {
      const sumMins = _.sumBy(
        filteredRoster,
        (p) => p.ok.off_team_poss_pct.value || 0
      );

      const sumFrontCourtMins = _.sumBy(
        filteredRoster.filter(isFrontCourt),
        (p) => p.ok.off_team_poss_pct.value || 0
      );
      const frontCourtScale = Math.min(
        maxFrontCourtMins / (sumFrontCourtMins || 1),
        1.0
      );

      const emergencyMeasures =
        step == finalStep && sumMins + benchMinOverrides > 5.0;
      //(ensure the sum of the players' + bench minutes is never more than physically possib;e)

      const threshold = 5.0 - minsForBench / 40.0 - benchMinOverrides;
      const maxGoal = 5.0 - benchMinOverrides; //(if bench specified then try to exactly hit 40mpg)
      const goal =
        allThreeBenchPosHaveOverriddenMins || emergencyMeasures
          ? maxGoal
          : threshold;
      const target = 0.025; //(within 1 min)

      //Diagnostic
      if (debugMode) {
        console.log(
          `Team [${team}]/ Step [${step}]: sum=[${sumMins.toFixed(
            3
          )}] [bench=${benchMinOverrides.toFixed(3)}] vs ` +
            `goal=[${goal.toFixed(3)}]/levels=[${threshold.toFixed(
              3
            )} - ${maxGoal.toFixed(3)}] = [${Math.abs(sumMins - goal).toFixed(
              3
            )}] ` +
            `frontcourt=[${frontCourtScale.toFixed(
              2
            )}](${sumFrontCourtMins.toFixed(2)})`
        );
      }
      if (
        (goal > 0 && Math.abs(sumMins - goal) > target) ||
        frontCourtScale < 0.99
      ) {
        const factor = goal / sumMins;
        // if we have too many front court minutes then treat frontcourt/backcourt separately
        const tooManyFrontCourtMins = sumFrontCourtMins * factor > 2.0; //(ie will end up with too many _after_ applying this iteration)
        const frontCourtFactor = tooManyFrontCourtMins
          ? 2.0 / sumFrontCourtMins
          : factor;
        const backCourtFactor = tooManyFrontCourtMins
          ? (goal - 2.0) / (sumMins - sumFrontCourtMins)
          : factor;
        filteredRoster.forEach((p) => {
          const hasMinsOverride = !_.isNil(overrides[p.key]?.mins);
          const finalFactor = isFrontCourt(p)
            ? frontCourtFactor
            : backCourtFactor;

          const playerProd = getNet(p.ok);
          const adjustedFinalFactor = _.thru(finalFactor, (factorToAdj) => {
            if (factorToAdj > 1.0 || step == finalStep) {
              //(Scale minutes up normally / final step no adjustments)
              return factorToAdj;
            } else if (playerProd > top3rdNetClump.avg - 0.5) {
              //we try to keep the best players' minutes high
              return step < 3 ? 1.0 : factorToAdj * 1.3;
            } else if (playerProd < avgLowerTierNet + 0.5) {
              //(reduce the worst players' min even further)
              return 0.8 * factorToAdj;
            } else {
              return factorToAdj; //(adjust everyone else similarly)
            }
          });
          if (!hasMinsOverride) {
            //(can't override players with fixed numbers)
            const prevMins = p.good.off_team_poss_pct?.value || 0;
            assignMins(prevMins * adjustedFinalFactor, p, emergencyMeasures);
          }
        });
      } else {
        // done, stop
        return false;
      }
    });
  }

  /** Calculates the expected efficiency of the bench for a team/year */
  static buildBenchEfficiency = (
    team: string,
    year: string,
    key: string,
    name: string,
    posClass: string,
    minsPctIn: number,
    lastYearBenchStats: IndivStatSet | undefined,
    overrides: Record<string, PlayerEditModel>
  ) => {
    const defaultBenchLevel = TeamEditorUtils.getBenchLevelScoring(team, year);

    const regressedBenchFactorOff = lastYearBenchStats //0.5 if played 20mpg
      ? Math.min(3 * (lastYearBenchStats.off_team_poss_pct?.value || 0), 0.5)
      : 0;
    const regressedBenchFactorDef = lastYearBenchStats
      ? Math.min(3 * (lastYearBenchStats.def_team_poss_pct?.value || 0), 0.5)
      : 0;
    //(the 3x is because we divided the mins by 3 earlier on to portion across the 3 position groups)

    const maybeOverrides = overrides[key];
    const benchLevelOverride = maybeOverrides?.profile;
    const benchLevel =
      0.5 *
      (benchLevelOverride
        ? TeamEditorUtils.getBenchLevelScoringByProfile(benchLevelOverride)
        : defaultBenchLevel);

    //TODO: want 0.6 and -0.3 to be constants (for average yearly growth)
    const regressedBenchLevelOff = lastYearBenchStats
      ? regressedBenchFactorOff *
          (TeamEditorUtils.getOff(lastYearBenchStats) + 0.6) +
        (1.0 - regressedBenchFactorOff) * benchLevel
      : benchLevel;

    const regressedBenchLevelDef = lastYearBenchStats
      ? regressedBenchFactorDef *
          (TeamEditorUtils.getDef(lastYearBenchStats) - 0.3) -
        (1.0 - regressedBenchFactorDef) * benchLevel
      : -benchLevel;

    const minsPct = !_.isNil(maybeOverrides?.mins)
      ? maybeOverrides.mins / 40.0
      : minsPctIn * 5;
    const offAdj = maybeOverrides?.global_off_adj || 0;
    const defAdj = maybeOverrides?.global_def_adj || 0;

    const baseBench = {
      key: name,
      off_team_poss_pct: { value: minsPct },
      def_team_poss_pct: { value: minsPct },
      off_adj_rapm: { value: regressedBenchLevelOff + offAdj },
      def_adj_rapm: { value: regressedBenchLevelDef + defAdj },
      posClass: posClass,
    };
    return {
      key: key,
      nil: maybeOverrides?.nil,
      good: {
        ...baseBench,
        off_adj_rapm: {
          value:
            regressedBenchLevelOff +
            TeamEditorUtils.optimisticBenchOrFr +
            offAdj,
        },
        def_adj_rapm: {
          value:
            regressedBenchLevelDef -
            TeamEditorUtils.optimisticBenchOrFr +
            defAdj,
        },
      },
      ok: {
        ...baseBench,
      },
      bad: {
        ...baseBench,
        off_adj_rapm: {
          value:
            regressedBenchLevelOff -
            TeamEditorUtils.pessimisticBenchOrFr +
            offAdj,
        },
        def_adj_rapm: {
          value:
            regressedBenchLevelDef +
            TeamEditorUtils.pessimisticBenchOrFr +
            defAdj,
        },
      },
      orig: baseBench,
      diag: {
        off_rtg: { good: {}, bad: {}, ok: {} },
        off_usage: { good: {}, bad: {}, ok: {} },
        off: {
          good: {
            incorp_prev_season: regressedBenchLevelOff - benchLevel,
          },
          bad: {
            incorp_prev_season: regressedBenchLevelOff - benchLevel,
          },
          ok: {
            incorp_prev_season: regressedBenchLevelOff - benchLevel,
          },
        },
        def: {
          good: {
            incorp_prev_season: regressedBenchLevelDef + benchLevel,
          },
          bad: {
            incorp_prev_season: regressedBenchLevelDef + benchLevel,
          },
          ok: {
            incorp_prev_season: regressedBenchLevelDef + benchLevel,
          },
        },
      },
    } as GoodBadOkTriple;
  };

  /** Inserts unused minutes */
  static getBenchMinutes(
    team: string,
    year: string,
    guardPctIn: number,
    wingPctIn: number,
    bigPctIn: number,
    lastYearBenchStats: IndivStatSet | undefined,
    overrides: Record<string, PlayerEditModel>,
    alwaysBuildBench: boolean
  ): [
    GoodBadOkTriple | undefined,
    GoodBadOkTriple | undefined,
    GoodBadOkTriple | undefined
  ] {
    const hasGuardOverride = !_.isNil(
      overrides[TeamEditorUtils.benchGuardKey]?.mins
    );
    const guardPctOverride =
      (0.2 * (overrides[TeamEditorUtils.benchGuardKey]?.mins || 0)) / 40;
    const guardPct = guardPctIn + guardPctOverride;
    const hasWingOverride = !_.isNil(
      overrides[TeamEditorUtils.benchWingKey]?.mins
    );
    const wingPctOverride =
      (0.2 * (overrides[TeamEditorUtils.benchWingKey]?.mins || 0)) / 40;
    const wingPct = wingPctIn + wingPctOverride;
    const hasBigOverride = !_.isNil(
      overrides[TeamEditorUtils.benchBigKey]?.mins
    );
    const bigPctOverride =
      (0.2 * (overrides[TeamEditorUtils.benchBigKey]?.mins || 0)) / 40;
    const bigPct = bigPctIn + bigPctOverride;

    const hasBenchOverrides =
      hasGuardOverride || hasWingOverride || hasBigOverride;
    const deltaMins = Math.max(0, 1.0 - (guardPct + wingPct + bigPct));

    //(if auto-calc need for bench minutes, or if any minutes overrides are in place)
    if (deltaMins > 0.0 || hasBenchOverrides || alwaysBuildBench) {
      const benchGuardMins = hasGuardOverride
        ? guardPct - guardPctIn
        : Math.min(Math.max(0, 0.3 - guardPct), deltaMins); // wings can play 50% of SG minutes
      const nonOverriddenBenchGuardMins = hasGuardOverride ? 0 : benchGuardMins;
      const benchBigMins = hasBigOverride
        ? bigPct - bigPctIn
        : Math.min(
            Math.max(0, 0.3 - bigPct), // wings can play 50% of PF minutes
            deltaMins - nonOverriddenBenchGuardMins
          ); //(subtract off bench guard minutes from the available minutes pool)
      const nonOverriddenBenchBigMins = hasBigOverride ? 0 : benchBigMins;
      const benchWingMins = hasWingOverride
        ? wingPct - wingPctIn
        : Math.max(
            0,
            deltaMins - nonOverriddenBenchGuardMins - nonOverriddenBenchBigMins
          ); //(wings get the leftover)

      // Diagnostics
      // console.log(`Bench ${deltaMins.toFixed(3)} [${hasGuardOverride}/${hasWingOverride}/${hasBigOverride}] = ${guardPct.toFixed(3)}/${benchGuardMins.toFixed(3)} ${wingPct.toFixed(3)}/${benchWingMins.toFixed(3)} ${bigPct.toFixed(3)}/${benchBigMins.toFixed(3)}`)

      const buildBench = (
        key: string,
        name: string,
        posClass: string,
        minsPctIn: number
      ) => {
        return TeamEditorUtils.buildBenchEfficiency(
          team,
          year,
          key,
          name,
          posClass,
          minsPctIn,
          lastYearBenchStats,
          overrides
        );
      };
      return [
        benchGuardMins > 0 || alwaysBuildBench
          ? buildBench(
              TeamEditorUtils.benchGuardKey,
              "Bench & Fr Guards",
              "G?",
              benchGuardMins
            )
          : undefined,
        benchWingMins > 0 || alwaysBuildBench
          ? buildBench(
              TeamEditorUtils.benchWingKey,
              "Bench & Fr Wings",
              "W?",
              benchWingMins
            )
          : undefined,
        benchBigMins > 0 || alwaysBuildBench
          ? buildBench(
              TeamEditorUtils.benchBigKey,
              "Bench & Fr Bigs",
              "PF/C",
              benchBigMins
            )
          : undefined,
      ];
    } else {
      return [undefined, undefined, undefined];
    }
  }

  /** Calculate the actual bench production and minutes */
  static calcActualBenchProduction = (
    teamStatsInfo: PureStatSet,
    players: GoodBadOkTriple[],
    avgEff: number
  ) => {
    const noDepthBonus = { off: 0, def: 0 };
    const totals = TeamEditorUtils.buildTotals(
      players,
      "orig",
      noDepthBonus,
      0
    );
    const totalOffMins =
      5.0 - _.sumBy(players, (p) => p.orig.off_team_poss_pct.value!);
    const totalDefMins =
      5.0 - _.sumBy(players, (p) => p.orig.def_team_poss_pct.value!);
    const leftoverOff =
      (teamStatsInfo.off_adj_ppp?.value || avgEff) - avgEff - totals.off;
    const leftoverDef =
      (teamStatsInfo.def_adj_ppp?.value || avgEff) - avgEff - totals.def;

    //console.log(`Bench: mins=[${totalOffMins.toFixed(2)}][${totalDefMins.toFixed(2)}] / off=[${(leftoverOff/(totalOffMins || 1)).toFixed(2)}], def=[${(leftoverDef/(totalDefMins || 1)).toFixed(2)}]`)

    return {
      key: "Generic Bench",
      off_adj_rapm: {
        value: totalOffMins > 0 ? leftoverOff / totalOffMins : 0,
      },
      def_adj_rapm: {
        value: totalDefMins > 0 ? leftoverDef / totalDefMins : 0,
      },
      off_team_poss_pct: { value: totalOffMins / 3 }, //NOTE: if you change this, you also have to change getBenchMinutes
      def_team_poss_pct: { value: totalDefMins / 3 },
    } as IndivStatSet;
  };

  //////////////////////////////////////////////////////////////////////////////

  // Lower level utils in handy testable chunks

  /** Statistic manipulation */
  private static addToVal = (
    s: Statistic | undefined,
    toAdd: number,
    scaler: number = 1
  ): Statistic | undefined => {
    if (s && !_.isNil(s.value)) {
      return {
        value: scaler * s.value + toAdd,
        old_value: _.isNil(s.old_value)
          ? undefined
          : scaler * s.old_value + toAdd,
      };
    } else {
      return undefined;
    }
  };

  /** Calculate SoS when you do have the team stats BUT they don't include SoS */
  static calcApproxTeamSoS(
    teamStats: PureStatSet,
    avgEff: number
  ): [number, number, number] {
    const offRaw = teamStats.off_ppp?.value || avgEff;
    const offAdj = teamStats.off_adj_ppp?.value || avgEff; // adj = raw*(avgEff/sos)
    const defSoS = (offRaw / offAdj) * avgEff;
    const defRaw = teamStats.def_ppp?.value || avgEff;
    const defAdj = teamStats.def_adj_ppp?.value || avgEff;
    const offSoS = (defRaw / defAdj) * avgEff;

    return [offSoS - defSoS, offSoS, defSoS];
  }

  /** Calculate SoS when you don't have the team stats */
  static calcApproxTeamSoSLegacy(
    origRoster: IndivStatSet[],
    avgEff: number
  ): [number, number, number] {
    if (!_.isEmpty(origRoster)) {
      const calcs = _.transform(
        origRoster,
        (acc, p) => {
          const thisOffPoss = p.off_team_poss_pct?.value || 0;
          const thisDefPoss = p.def_team_poss_pct?.value || 0;
          acc.off_poss += thisDefPoss; //(reversed because I play against opposing defense)
          acc.def_poss += thisOffPoss;
          acc.sum_off += (p.off_adj_opp?.value || avgEff) * thisDefPoss;
          acc.sum_def += (p.def_adj_opp?.value || avgEff) * thisOffPoss;
        },
        {
          off_poss: 0,
          def_poss: 0,
          sum_off: 0,
          sum_def: 0,
        }
      );
      const offSoS = calcs.sum_off / (calcs.off_poss || 1);
      const defSoS = calcs.sum_def / (calcs.def_poss || 1);
      return [offSoS - defSoS, offSoS, defSoS];
    } else {
      //(just return some generic number)
      return [8, avgEff + 4, avgEff - 4];
    }
  }

  /** Estimate the maximum number of minutes played based on their fouling rate */
  static calcMaxMins(p: GoodBadOkTriple, benchLevel: number | undefined) {
    if (p.manualProfile) {
      return TeamEditorUtils.getFreshmenMaxMins(p, benchLevel) / 40;
    } else {
      const improvement =
        p.orig.roster?.year_class == "Fr"
          ? 0.5
          : p.orig.roster?.year_class == "So"
          ? 0.5
          : 0;

      const foulsPer50 = Math.min(
        Math.max(0, (p.orig.def_ftr?.value || 0) * 100 - improvement),
        6
      );

      // (can't turn into an iron man without showing signs the previous season!)
      const playedATonLastYear = (p.orig?.off_team_poss_pct?.value || 0) >= 0.7;
      const playedVeryLittleLastYear =
        (p.orig?.off_team_poss_pct?.value || 0) <= 0.3;

      const baseMax = playedATonLastYear
        ? 0.85
        : playedVeryLittleLastYear
        ? 0.6
        : 0.76;
      if (foulsPer50 > 4) {
        //(so now by construction it's in the 6-4 range)
        return baseMax - (foulsPer50 - 4) * 0.1;
      } else {
        return baseMax;
      }
    }
  }

  /** Estimate the minimum number of minutes played based on their minutes the previous season */
  static calcMinMins(
    p: GoodBadOkTriple,
    benchLevel: number | undefined,
    team: string,
    teamSosNet: number,
    avgEff: number
  ) {
    if (p.manualProfile) {
      const levelAboveBench =
        p.manualProfile?.profile && !_.isNil(benchLevel)
          ? TeamEditorUtils.profileToProfileLevel(p.manualProfile?.profile) -
            benchLevel
          : 1;

      return Math.max(0, Math.min(8, levelAboveBench * 4)) / 40; //(some nominal value)
    } else {
      const currPossPct = p.orig.off_team_poss_pct?.value || 0.25;
      if (p.orig.team == team && p.orig.roster?.year_class == "Fr") {
        // Fr always increase their minutes
        return currPossPct;
      } else if (p.orig.team != team) {
        // If you are a transfer then all bets are off:
        return 0.15;
      } else {
        // team member
        return currPossPct * 0.75; //(at most a 25% drop in numbers)
      }
    }
  }

  /** If transferring up (assumed if this method is called), then very short players may incur a offensive/defensive penalty */
  static calcTxferUpHeightEffDrop(p: IndivStatSet) {
    const heightStrToIn = (s?: string) => {
      //(for some reason sometimes don't have height_in but do have height)
      if (s && /^[0-9]-[0-9]+$/.test(s)) {
        const heightFrags = s.split("-");
        return parseInt(heightFrags[0]) * 12 + parseInt(heightFrags[1]!);
      } else return undefined;
    };
    const heightIn = p.roster?.height_in || heightStrToIn(p.roster?.height);

    if (heightIn) {
      // Arbitrarily escalating scale (the idea is that the more you rely on physicality, the harder it is to get a shot off)
      if ((p.posClass == "PG" || p.posClass == "s-PG") && heightIn <= 70) {
        //5'10-
        return -0.3;
      } else if (p.posClass == "CG" && heightIn <= 72) {
        // 6'0-
        return -0.4;
      } else if (p.posClass == "WG" && heightIn <= 74) {
        // 6'2-
        return -0.4;
      } else if (p.posClass == "WF" && heightIn <= 77) {
        // 6'5-
        return -0.5;
      } else if (p.posClass == "S-PG" && heightIn <= 78) {
        // 6'6-
        return -0.5;
      } else if (p.posClass == "PF/C" && heightIn <= 79) {
        // 6'7-
        return -0.5;
      } else if (p.posClass == "C" && heightIn <= 79) {
        // 6'7-
        return -0.8;
      } else {
        return 0;
      }
    } else {
      //nothing we can do
      return 0;
    }
  }

  /** Gives the next year of a player (for off-season) */
  static getNextClass(s: string | undefined) {
    if (s == "Fr") return "So";
    else if (s == "So") return "Jr";
    else if (s == "Jr") return "Sr";
    else if (s == "Sr") return "Sr*";
    else return "So?";
  }

  /** An alternative minute allocation to netTierToBaseMins - clump nearby nets */
  static netClumpsToBaseMins(
    playerNet: number,
    top3rdClump: NetClump,
    clumps: NetClump[]
  ): number | undefined {
    if (playerNet > top3rdClump.max) {
      return 0.85;
    } else if (playerNet >= top3rdClump.min) {
      return 0.75;
    } else {
      //TODO finish this off - until then just fall back to netTierToBaseMins (works OK)
      return undefined;
    }
  }

  /** Assign a fairly abitrary minute total based on where you sit in the team pecking order... */
  static netTierToBaseMins(playerNet: number, tiers: [number, number, number]) {
    // expand to 7 numbers by introducing the gaps
    const expandedTiers = [
      tiers[0] - 0.5,
      tiers[0],
      0.5 * (tiers[0] + tiers[1]),
      tiers[1],
      0.5 * (tiers[1] + tiers[2]),
      tiers[2],
      tiers[2] + 1.0,
    ];
    const expandedTierToMins = [0.15, 0.3, 0.45, 0.55, 0.65, 0.75, 0.85];

    const closestExpandedTier = _.sortBy(
      expandedTiers.map(
        (t, i) => [i, Math.abs(playerNet - t)] as [number, number]
      ),
      (vi) => vi[1]
    )[0]![0];

    return expandedTierToMins?.[closestExpandedTier] || 0.9;
  }

  /** Gets a max cap on Fr minutes */
  static getFreshmenMaxMins(
    triple: GoodBadOkTriple,
    benchLevel: number | undefined
  ) {
    const levelAboveBench =
      triple.manualProfile?.profile && !_.isNil(benchLevel)
        ? TeamEditorUtils.profileToProfileLevel(triple.manualProfile?.profile) -
          benchLevel
        : 1;

    const isBig =
      PositionUtils.posClassToScore(triple.orig.posClass || "") > 5500;
    const bigPenalty = isBig ? 5 : 0;

    // Smooth over discontinuities in rating for 3-4*s
    const ratingBonusOrPenalty =
      Math.max(
        -0.5,
        Math.min(
          0.5,
          (triple.manualProfile?.global_off_adj || 0) -
            (triple.manualProfile?.global_def_adj || 0)
        )
      ) * 5;

    if (levelAboveBench >= 3) {
      return 30 - bigPenalty;
    } else if (levelAboveBench >= 2) {
      return 25 - bigPenalty + ratingBonusOrPenalty;
    } else if (levelAboveBench >= 1) {
      return 20 - bigPenalty + ratingBonusOrPenalty;
    } else {
      return 15 - bigPenalty + ratingBonusOrPenalty;
    }
  }

  /** Upside on bench/Fr predictions */
  static readonly optimisticBenchOrFr = 0.75;
  /** Downside on bench/Fr predictions - bench scoring can be bad so we make this higher */
  static readonly pessimisticBenchOrFr = 1.25;

  /** Gets the bench level scoring depending on the quality of the team
   * note this is (off-def) margin, use 0.5* to get off and def components
   */
  static getBenchLevelScoring(team: string, year: string) {
    const level = _.find(
      AvailableTeams.byName[team] || [],
      (teamInfo) => teamInfo.year == year
    ) ||
      AvailableTeams.byName[team]?.[0] || { category: "unknown" };

    const getBenchLevel = () => {
      if (team == "Gonzaga") {
        // Treat as high major
        return TeamEditorUtils.getBenchLevelScoringByProfile("3.5*/T150ish");
      } else if (level.category == "high") {
        return TeamEditorUtils.getBenchLevelScoringByProfile("3.5*/T150ish");
      } else if (level.category == "midhigh") {
        return TeamEditorUtils.getBenchLevelScoringByProfile("3*");
      } else if (level.category == "mid") {
        return TeamEditorUtils.getBenchLevelScoringByProfile("3+2*s");
      } else if (level.category == "midlow") {
        return TeamEditorUtils.getBenchLevelScoringByProfile("2*");
      } else if (level.category == "low") {
        return TeamEditorUtils.getBenchLevelScoringByProfile("UR");
      } else {
        //unknown
        return TeamEditorUtils.getBenchLevelScoringByProfile(undefined);
      }
    };
    return getBenchLevel();
  }

  /** Switches a team/profile level to a number so they can be compared */
  private static teamToProfileLevel(
    team: string,
    year: string
  ): number | undefined {
    const levelToNumber = (level: string) => {
      switch (level) {
        case "high":
          return 5;
        case "midhigh":
          return 4;
        case "mid":
          return 3;
        case "midlow":
          return 2;
        case "low":
          return 1;
        default:
          return undefined;
      }
    };
    const getConfInfo = (team: string) =>
      _.find(
        AvailableTeams.byName[team] || [],
        (teamInfo) => teamInfo.year == year
      ) ||
      AvailableTeams.byName[team]?.[0] || {
        category: "unknown",
        index_template: "unknown",
      };

    const confInfo = getConfInfo(team);
    const levelToNumberVal = levelToNumber(confInfo.category || "unknown");

    return _.isUndefined(levelToNumberVal)
      ? undefined
      : levelToNumberVal +
          getConfAdjustment(confInfo.index_template || "unknown", year) +
          TeamEditorUtils.getTeamLevelAboveConf(team, year);
  }

  /** Switches a team/profile level to a number so they can be compared */
  private static profileToProfileLevel = (profile: Profiles): number => {
    switch (profile) {
      case "5*/Lotto":
        return 9;
      case "5*":
        return 8;
      case "4*/T40ish":
        return 7;
      case "4*":
        return 6;
      case "3.5*/T150ish":
        return 5;
      case "3*":
        return 4;
      default:
        return 3;
    }
  };

  /** Returns a numeric value for how many "levels" a player has jumped */
  static getJumpInLevel(
    oldTeam: string,
    newTeam: string,
    year: string
  ): undefined | number {
    const oldLevel = TeamEditorUtils.teamToProfileLevel(oldTeam, year);
    const newLevel = TeamEditorUtils.teamToProfileLevel(newTeam, year);
    if (_.isNil(oldLevel) || _.isNil(newLevel)) {
      return undefined;
    } else {
      return newLevel - oldLevel;
    }
  }

  static getFrOffDef(
    fr: PlayerEditModel | undefined
  ): [number, number] | undefined {
    if (fr?.profile) {
      const basic = TeamEditorUtils.getBenchLevelScoringByProfile(fr.profile);
      return [
        basic + (fr.global_off_adj || 0),
        -basic + (fr.global_def_adj || 0),
      ];
    } else {
      return undefined;
    }
  }

  /** Provides an offense/defense based on "HS recruitment level, see TeamRosterEditor"
   * note this is (off-def) margin, use 0.5* to get off and def components
   */
  static getBenchLevelScoringByProfile(profile: Profiles | undefined): number {
    //(these numbers derived from looking at the T200 Fr for the last 4 years - the lower ranges are purely guesswork)
    const lotto = 6.5; //6.5 to 5.5, depending on penalty
    const fiveStar = 5.2; // 5.2 to 4.2 depending on penalty
    const borderline5Star = 4.6;
    const top40 = 3.5; //3 to 4 depending on bonus
    //(discontinuity here, slightly arbitrary but blue chip Fr do seem to have a jump)
    const fourStar = 1.5; // 1 to 2 depending on bonus
    if (profile == "5*/Lotto") {
      // blend the various RAPM range because a lotto pick sometimes just ... isn't...
      return 0.7 * lotto + 0.2 * fiveStar + 0.1 * top40;
    } else if (profile == "5*") {
      return 0.1 * lotto + 0.7 * fiveStar + 0.2 * top40;
    } else if (profile == "5+4*s") {
      //(still support this even though it's no longer selectible)
      return 0.8 * borderline5Star + 0.2 * top40;
    } else if (profile == "4*/T40ish") {
      return 0.15 * borderline5Star + 0.7 * top40 + 0.15 * fourStar;
    } else if (profile == "4*") {
      //(from here on down it's symmetric)
      return fourStar;
    } else if (profile == "3.5*/T150ish") {
      return 0.5; //0 to 1 depending on bonus)
    } else if (profile == "3*") {
      return -0.5; // -1.0 to 0 depending on bonus
    } else if (profile == "3+2*s") {
      //(not selectible)
      return -2; //(discontinuity here there is a huge rating range of "3*" and they aren't v distinguishable)
    } else if (profile == "2*") {
      return -3;
    } else if (profile == "UR") {
      return -4;
    } else {
      return 0; //(error)
    }
  }

  /** To regress Fr players we'll move them in this direction - TODO would be nice to include '*' rating in this
   * note this is (off-def) margin, use 0.5* to get off and def components
   */
  static getAvFrProduction(team: string, year: string) {
    const level = _.find(
      AvailableTeams.byName[team] || [],
      (teamInfo) => teamInfo.year == year
    ) || { category: "unknown" };
    const getAvgLevel = () => {
      if (level.category == "high") {
        return 2.5;
      } else if (level.category == "midhigh") {
        return 1.5;
      } else if (level.category == "mid") {
        return 0;
      } else if (level.category == "midlow") {
        return -1;
      } else if (level.category == "midlow") {
        return -2.5;
      } else {
        //unknown
        return 0;
      }
    };
    return getAvgLevel() + TeamEditorUtils.getTeamLevelAboveConf(team, year);
  }

  /** There's a few teams who look more like high major teams despite playing in mid majors (etc): 0-1 range */
  static getTeamLevelAboveConf(team: string, year: string) {
    if (team == "Gonzaga") {
      return 1.0;
    } else if (team == "San Diego St.") {
      return 0.5;
    } else if (team == "Saint Mary's (CA)") {
      return 0.5;
    }
    return 0;
  }

  /** A very silly function that makes a guess at how coaches might value players */
  static readonly getReturningPlayerNil = (
    player: IndivStatSet,
    transferringIn: boolean,
    isTrackRecord: boolean,
    roster?: RosterEntry
  ) => {
    const leaveNilForUserEntry = true;
    //(seems safest!! TODO: note also Fr NIL not even calculated, so this can't really be enabled .. plus docs say it's user entered)
    if (leaveNilForUserEntry) {
      return 0;
    }

    const baseOffCost = 30; //(use 30K as a completely arbitrary factor to get "$")
    const baseDefCost = 30; //(use 30K as a completely arbitrary factor to get "$")

    const minPct = player.off_team_poss_pct?.value || 0;
    const projOrActualOff =
      (isTrackRecord
        ? player.off_adj_rtg?.value
        : TeamEditorUtils.getOff(player)) || 0;

    const slidingCostFactor = Math.sqrt(
      Math.min(Math.max(0, projOrActualOff - 5.5), 4)
    ); //super stars get more money

    const boxOffNil =
      Math.max(projOrActualOff || 0, 0) *
      minPct *
      baseOffCost *
      (1 + slidingCostFactor); // 30K per +1/100

    // Exceptional defenders get a bonus
    const projOrActualDef = -TeamEditorUtils.getDef(player);
    const defSlidingScaleBonus = Math.min(
      Math.max(0, projOrActualDef - 2.5),
      2
    );
    const defBonus = defSlidingScaleBonus * minPct * baseDefCost;

    const classBonus = _.thru(roster?.year_class, (val) => {
      if (val == "So") {
        return 10;
      } else if (val == "Jr") {
        return 20;
      } else if (val == "Sr") {
        return 30;
      } else if (val == "Sr*") {
        return 40;
      } else {
        return 25; //(Fr "signing bonus")
      }
    });
    //(currently don't have a transfer bonus)

    //console.log(`${player.code}: ${projOrActualOff.toFixed(1)} / ${TeamEditorUtils.getDef(player).toFixed(1)} .. ${boxOffNil.toFixed(1)} (x${slidingCostFactor.toFixed(2)}) ${defBonus.toFixed(1)} + ${classBonus}`)

    return boxOffNil + defBonus + classBonus;
  };

  /** Builds the list of players to calculate the actual season prediction over */
  static readonly getFilteredPlayersWithBench = (
    pxResults: TeamEditorProcessingResults,
    disabledPlayers: Record<string, boolean>
  ) => {
    return pxResults.basePlayersPlusHypos
      .filter((triple) => !disabledPlayers[triple.key])
      .concat(pxResults.maybeBenchGuard ? [pxResults.maybeBenchGuard] : [])
      .concat(pxResults.maybeBenchWing ? [pxResults.maybeBenchWing] : [])
      .concat(pxResults.maybeBenchBig ? [pxResults.maybeBenchBig] : []);
  };

  static readonly calcDepthBonus = (
    triples: GoodBadOkTriple[],
    team: string
  ) => {
    const noBenchTriples = triples.filter((t) => !t.key.startsWith("bench"));
    if (noBenchTriples.length > 7) {
      // Might get a depth bonus!
      // Basically if a player under-achieves but you have depth then their understudies in the rotation
      // can take their place!
      const triplesByNetRapm = _.sortBy(
        noBenchTriples,
        (triple) => -TeamEditorUtils.getNet(triple.ok)
      );
      const top7Triples = _.reverse(_.take(triplesByNetRapm, 7)); //(worst first)
      const bottomTriples = _.drop(triplesByNetRapm, 7);
      const triplesToComp = _.zip(top7Triples, bottomTriples);
      const adjustments = _.transform(
        triplesToComp,
        (acc, topBottom) => {
          const topTriple = topBottom[0];
          const bottomTriple = topBottom[1];
          if (topTriple && bottomTriple) {
            // Average top being bad / bottom being good scenarios
            const topNotGreatOff =
              0.25 * TeamEditorUtils.getOff(topTriple.ok) +
              0.75 * TeamEditorUtils.getOff(topTriple.bad);
            const topNotGreatDef =
              0.25 * TeamEditorUtils.getDef(topTriple.ok) +
              0.75 * TeamEditorUtils.getDef(topTriple.bad);
            const bottomDecentOff =
              0.75 * TeamEditorUtils.getOff(bottomTriple.ok) +
              0.25 * TeamEditorUtils.getOff(bottomTriple.good);
            const bottomDecentDef =
              0.75 * TeamEditorUtils.getDef(bottomTriple.ok) +
              0.25 * TeamEditorUtils.getDef(bottomTriple.good);
            const netAdj =
              0.25 *
              Math.max(
                0,
                bottomDecentOff -
                  topNotGreatOff -
                  (bottomDecentDef - topNotGreatDef)
              );
            if (netAdj > 0) {
              const offAdj = 0.25 * (bottomDecentOff - topNotGreatOff);
              const defAdj = 0.25 * (bottomDecentDef - topNotGreatDef);
              acc.off = acc.off + offAdj;
              acc.def = acc.def + defAdj;

              //Diag:
              //console.log(`Player Depth adj: [${team}]: top=[${topTriple.key}] vs bot=[${bottomTriple.key}]: off=[${offAdj.toFixed(2)}] def=[${defAdj.toFixed(2)}] net=[${netAdj.toFixed(2)}]`);
            }
          } else return false; //(all done here)
        },
        { off: 0, def: 0 }
      );

      return adjustments;
    } else {
      return { off: 0, def: 0 };
    }
  };

  /** Sums the given projection in a set of projections for the team */
  static readonly buildTotals = (
    triples: GoodBadOkTriple[],
    range: "good" | "bad" | "ok" | "orig",
    depthBonus: { off: number; def: number },
    adj: number = 0
  ) => {
    const depthBonusFactor = (() => {
      switch (range) {
        case "good":
          return 1.5;
        case "ok":
          return 1;
        case "bad":
          return 0.5;
        default:
          return 0;
      }
    })();
    const off =
      _.sumBy(triples, (triple) => {
        return (
          (triple[range]?.off_team_poss_pct.value || 0) *
          TeamEditorUtils.getOff(triple[range] || {})
        );
      }) +
      adj +
      depthBonus.off * depthBonusFactor;
    const def =
      _.sumBy(triples, (triple) => {
        return (
          (triple[range]?.off_team_poss_pct.value || 0) *
          TeamEditorUtils.getDef(triple[range] || {})
        );
      }) -
      adj +
      depthBonus.def * depthBonusFactor;
    const net =
      _.sumBy(triples, (triple) => {
        return (
          (triple[range]?.off_team_poss_pct.value || 0) *
          TeamEditorUtils.getNet(triple[range] || {})
        );
      }) +
      2 * adj +
      (depthBonus.off - depthBonus.def) * depthBonusFactor;
    return { off, def, net };
  };

  /* Quick accessor for offensive contribution of player */
  static getOff = (s: PureStatSet, factor: number = 1.0) =>
    ((s.off_adj_rapm || s.off_adj_rtg)?.value || 0) * factor;
  /* Quick accessor for defensive contribution of player */
  static getDef = (s: PureStatSet, factor: number = 1.0) =>
    ((s.def_adj_rapm || s.def_adj_rtg)?.value || 0) * factor;
  /* Quick accessor for net (offensive + defensive) contribution of player */
  static getNet = (s: PureStatSet, factor: number = 1.0) =>
    TeamEditorUtils.getOff(s, factor) - TeamEditorUtils.getDef(s, factor);
}
