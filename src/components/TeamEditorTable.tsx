// React imports:
import React, { useState, useEffect } from "react";

// Lodash:
import _ from "lodash";

// Bootstrap imports:

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import Dropdown from "react-bootstrap/Dropdown";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";

// Additional components:
// @ts-ignore
import LoadingOverlay from "@ronchalant/react-loading-overlay";
//@ts-ignore
import Select, { components } from "react-select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLink,
  faCheck,
  faPen,
  faFilter,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import ClipboardJS from "clipboard";

// Component imports
import GenericTable, { GenericTableOps } from "./GenericTable";
import GenericTogglingMenu from "./shared/GenericTogglingMenu";
import GenericTogglingMenuItem from "./shared/GenericTogglingMenuItem";
import ToggleButtonGroup from "./shared/ToggleButtonGroup";
import PlayerLeaderboardTable, {
  PlayerLeaderboardStatsModel,
} from "./PlayerLeaderboardTable";

// Table building
import {
  DivisionStatsCache,
  GradeTableUtils,
  PositionStatsCache,
} from "../utils/tables/GradeTableUtils";

// Util imports
import {
  PlayerLeaderboardParams,
  ParamDefaults,
  TeamEditorParams,
  OffseasonLeaderboardParams,
} from "../utils/FilterModels";
import {
  GoodBadOkTriple,
  PlayerEditModel,
  TeamEditorUtils,
} from "../utils/stats/TeamEditorUtils";

import {
  PureStatSet,
  DivisionStatistics,
  Statistic,
  TeamStatInfo,
} from "../utils/StatModels";
import { AvailableTeams } from "../utils/internal-data/AvailableTeams";
import GenericCollapsibleCard from "./shared/GenericCollapsibleCard";
import { GradeUtils } from "../utils/stats/GradeUtils";
import { LeaderboardUtils, TransferModel } from "../utils/LeaderboardUtils";
import TeamRosterEditor from "./shared/TeamRosterEditor";
import { TeamEditorTableUtils } from "../utils/tables/TeamEditorTableUtils";
import { UrlRouting } from "../utils/UrlRouting";
import { efficiencyAverages } from "../utils/public-data/efficiencyAverages";
import { DateUtils } from "../utils/DateUtils";
import { TeamEditorManualFixes } from "../utils/stats/TeamEditorManualFixes";
import { DerivedStatsUtils } from "../utils/stats/DerivedStatsUtils";
import {
  ConferenceToNickname,
  latestConfChanges,
} from "../utils/public-data/ConferenceInfo";
import { efficiencyInfo } from "../utils/internal-data/efficiencyInfo";
import { FeatureFlags } from "../utils/stats/FeatureFlags";
import { CbbColors } from "../utils/CbbColors";
import { IndivStatSet } from "../utils/StatModels";
import ThemedSelect from "./shared/ThemedSelect";

// Input params/models

export type TeamEditorStatsModel = {
  players?: Array<IndivStatSet>;
  teamStats?: Array<TeamStatInfo>;
  confs?: Array<string>;
  confMap?: Map<string, Array<string>>;
  lastUpdated?: number;
  transfers?: Record<string, Array<TransferModel>>[];
  error?: string;
};
type Props = {
  startingState: TeamEditorParams;
  dataEvent: TeamEditorStatsModel;
  onChangeState: (newParams: TeamEditorParams) => void;
  overrideGrades?: DivisionStatistics;
};

/** Handy util for reducing number format for JSON readability (in diag mode, can remove once that has been replaced) */
const reduceNumberSize = (k: string, v: any) => {
  if (_.isNumber(v)) {
    const rawNumStr = "" + v;
    const numStr = v.toFixed(2);
    if (numStr.length >= rawNumStr.length) {
      //made it worse
      return v;
    } else {
      return parseFloat(numStr);
    }
  } else {
    return v;
  }
};

// Functional component

const TeamEditorTable: React.FunctionComponent<Props> = ({
  startingState,
  dataEvent,
  onChangeState,
  overrideGrades,
}) => {
  const server =
    typeof window === `undefined` //(ensures SSR code still compiles)
      ? "server"
      : window.location.hostname;

  /** Only show help for diagnstic on/off on main page */
  const showHelp = !_.startsWith(server, "cbb-on-off-analyzer");

  // 1] Data Model

  const [clipboard, setClipboard] = useState(null as null | ClipboardJS);

  // 2] State (not controllable from outside the page)
  const [debugMode, setDebugMode] = useState(false);

  // Misc control toggles
  const [showPrevSeasons, setShowPrevSeasons] = useState(
    _.isNil(startingState.showPrevSeasons)
      ? false
      : startingState.showPrevSeasons
  );
  const [evalMode, setEvalMode] = useState(
    _.isNil(startingState.evalMode) ? false : startingState.evalMode
  );
  const [offSeasonMode, setOffSeasonMode] = useState(
    evalMode ||
      (_.isNil(startingState.offSeason) ? true : startingState.offSeason)
  );
  const [alwaysShowBench, setAlwaysShowBench] = useState(
    _.isNil(startingState.alwaysShowBench)
      ? false
      : startingState.alwaysShowBench
  );
  const [superSeniorsBack, setSuperSeniorsBack] = useState(
    _.isNil(startingState.superSeniorsBack)
      ? false
      : startingState.superSeniorsBack
  );

  type DiffBasisObj = {
    data?: PureStatSet;
    grades?: PureStatSet;
    projectedGrades?: PureStatSet;
  };
  const [diffBasis, setDiffBasis] = useState(
    (_.isNil(startingState.diffBasis)
      ? undefined
      : JSON.parse(startingState.diffBasis)) as undefined | DiffBasisObj
  );
  const [enableNil, setEnableNil] = useState(
    _.isNil(startingState.enableNil)
      ? FeatureFlags.isActiveWindow(FeatureFlags.estimateNilValue)
      : startingState.enableNil
  );
  /** Show team and individual grades */
  const [showGrades, setShowGrades] = useState(
    _.isNil(startingState.showGrades) ? "" : startingState.showGrades
  );
  const [caliberMode, setCaliberMode] = useState<boolean>(
    FeatureFlags.isActiveWindow(FeatureFlags.playerCaliberMode)
  ); //TODO: wire up

  // Data source
  const [year, setYear] = useState(
    startingState.year || DateUtils.offseasonPredictionYear
  );
  /** The first year containing stats used for projection (note in eval mode we also use the current year's stats) */
  const yearWithStats = offSeasonMode ? DateUtils.getPrevYear(year) : year;

  const [gender, setGender] = useState(
    startingState.gender || ParamDefaults.defaultGender
  );
  // Data source
  const [team, setTeam] = useState(
    startingState.team || ParamDefaults.defaultTeam
  );

  const usePreseasonRanksOnly =
    offSeasonMode &&
    DateUtils.hasPreseasonRankings[`${gender}_${year}`] &&
    !evalMode; //(always use both in eval mode, see below)

  const useLastSeasonAndPreseasonRanks =
    offSeasonMode &&
    (DateUtils.usePreseasonAndLastSeason[`${gender}_${year}`] || evalMode);
  //(the existing logic handles the case where they aren't available)

  /** Pre-calculate this */
  const teamList = AvailableTeams.getTeams(
    null,
    year == "All" ? ParamDefaults.defaultLeaderboardYear : yearWithStats,
    gender
  );

  const activeTransferSeason =
    DateUtils.yearWithActiveTransferPortal == year &&
    DateUtils.offseasonPredictionYear == year;

  // Handling various ways of uploading data
  const [onlyTransfers, setOnlyTransfers] = useState(
    _.isNil(startingState.showOnlyTransfers)
      ? activeTransferSeason //(if not specified then "show only transfers" only if in off-season mode)
      : startingState.showOnlyTransfers
  );
  /** (don't show "transfers-only" if this is the case - portalpalooza has not started yet) */
  const nextYearBeforePortalIsActive =
    year < DateUtils.yearWithActiveTransferPortal;

  const [onlyThisYear, setOnlyThisYear] = useState(
    _.isNil(startingState.showOnlyCurrentYear)
      ? true
      : startingState.showOnlyCurrentYear
  );
  const [reloadData, setReloadData] = useState(false);
  const hasTransfers = gender == "Men" && yearWithStats >= "2019";

  // Core team editor state

  //(the values passed in by URL pre-transform)
  const [otherPlayerCacheIn, setOtherPlayerCacheIn] = useState(
    (startingState.addedPlayers || "") as string | undefined
  );
  const [disabledPlayersIn, setDisabledPlayersIn] = useState(
    (startingState.disabledPlayers || "") as string | undefined
  );
  const [uiDeletedPlayersIn, setUiDeletedPlayersIn] = useState(
    (startingState.deletedPlayers || "") as string | undefined
  );
  const [editOpenIn, setEditOpenIn] = useState(
    (startingState.editOpen || "") as string | undefined
  );
  const [uiOverridesIn, setUiOverridesIn] = useState(
    (startingState.overrides || "") as string | undefined
  );

  const [otherPlayerCache, setOtherPlayerCache] = useState(
    {} as Record<string, GoodBadOkTriple>
  );
  const [disabledPlayers, setDisabledPlayers] = useState(
    {} as Record<string, boolean>
  );
  const [deletedPlayers, setDeletedPlayers] = useState(
    {} as Record<string, string>
  ); //(value is key, for display)
  const [uiOverrides, setUiOverrides] = useState(
    {} as Record<string, PlayerEditModel>
  );

  // Indiv editor
  const [allEditOpen, setAllEditOpen] = useState(
    startingState.allEditOpen as string | undefined
  );
  const [editOpen, setEditOpen] = useState({} as Record<string, string>);
  const [factorMins, setFactorMins] = useState(
    startingState.factorMins || false
  );

  // Controlling the player leaderboard table
  const [lboardAltDataSource, setLboardAltDataSource] = useState(
    undefined as PlayerLeaderboardStatsModel | undefined
  );
  const [lboardParams, setLboardParams] = useState(
    startingState as PlayerLeaderboardParams
  );

  // (Grade builder)
  // Team: complicated because sometimes we need to show two sets of grades
  const [divisionStatsCache, setDivisionStatsCache] = useState(
    {} as DivisionStatsCache
  );
  const [preSeasonDivisionStats, setPreSeasonDivisionStats] = useState<
    DivisionStatistics | undefined
  >(overrideGrades);
  // Player: Just always show the closest year that exists
  const [positionalStatsCache, setPositionalStatsCache] =
    useState<PositionStatsCache>({});
  const [playerDivisionStatsCache, setPlayerDivisionStatsCache] =
    useState<DivisionStatsCache>({});

  // Misc display

  /** Set this to be true on expensive operations */
  const [loadingOverride, setLoadingOverride] = useState(false);

  const [addNewPlayerMode, setAddNewPlayerMode] = useState(
    overrideGrades != undefined
  ); //(can't override this from URL)

  useEffect(() => {
    // Add and remove clipboard listener
    initClipboard();

    if (typeof document !== `undefined`) {
      //(if we added a clipboard listener, then remove it on page close)
      //(if we added a submitListener, then remove it on page close)
      return () => {
        if (clipboard) {
          clipboard.destroy();
          setClipboard(null);
        }
      };
    }
  });

  useEffect(() => {
    //(this ensures that the filter component is up to date with the union of these fields)

    if (!overrideGrades) {
      //(in override mode, need to push a button explicitly)
      const newState = {
        ...startingState,
        ...lboardParams,
        gender: gender,
        year: year,
        team: team,
        factorMins: factorMins,
        // Editor specific settings for team editor itself
        // there's some complexity here because we can't update this until we've used them to build the caches
        addedPlayers: _.isNil(otherPlayerCacheIn)
          ? _.keys(otherPlayerCache).join(";")
          : otherPlayerCacheIn,
        deletedPlayers: _.isNil(uiDeletedPlayersIn)
          ? _.keys(deletedPlayers).join(";")
          : uiDeletedPlayersIn,
        disabledPlayers: _.isNil(disabledPlayersIn)
          ? _.keys(disabledPlayers).join(";")
          : disabledPlayersIn,
        overrides: _.isNil(uiOverridesIn)
          ? _.map(uiOverrides, (value, key) =>
              TeamEditorUtils.playerEditModelToUrlParams(key, value)
            ).join(";")
          : uiOverridesIn,
        editOpen: _.isNil(editOpenIn)
          ? _.map(editOpen, (value, key) => `${key}|${value}`).join(";")
          : editOpenIn,
        // Editor specific settings for transfer view
        showOnlyTransfers: onlyTransfers,
        showOnlyCurrentYear: onlyThisYear,
        offSeason: offSeasonMode,
        showPrevSeasons: showPrevSeasons,
        alwaysShowBench: alwaysShowBench,
        superSeniorsBack: superSeniorsBack,
        evalMode: evalMode,
        allEditOpen: allEditOpen,
        diffBasis: _.isNil(diffBasis) ? undefined : JSON.stringify(diffBasis),
        enableNil: enableNil,
        showGrades: showGrades,
      };
      onChangeState(newState);
    }
  }, [
    year,
    gender,
    team,
    onlyTransfers,
    onlyThisYear,
    allEditOpen,
    otherPlayerCache,
    disabledPlayers,
    deletedPlayers,
    uiOverrides,
    editOpen,
    diffBasis,
    enableNil,
    lboardParams,
    showPrevSeasons,
    factorMins,
    offSeasonMode,
    alwaysShowBench,
    superSeniorsBack,
    evalMode,
    showGrades,
  ]);

  /** Converts team editor state to offseason leaderboard state (need to prefix each key with `$team__` in the leaderboard */
  const buildStateForTeamLeaderboard = () => {
    return _.omit(
      {
        factorMins: factorMins,
        addedPlayers: _.keys(otherPlayerCache).join(";"),
        deletedPlayers: _.keys(deletedPlayers).join(";"),
        disabledPlayers: _.keys(disabledPlayers).join(";"),
        overrides: _.isNil(uiOverridesIn)
          ? _.map(uiOverrides, (value, key) =>
              TeamEditorUtils.playerEditModelToUrlParams(key, value)
            ).join(";")
          : uiOverridesIn,
        superSeniorsBack: superSeniorsBack,
        showPrevSeasons: showPrevSeasons,
        alwaysShowBench: alwaysShowBench,
        diffBasis: _.isNil(diffBasis) ? undefined : JSON.stringify(diffBasis),
        enableNil: enableNil,
      },
      ([] as string[])
        .concat(factorMins ? [] : ["factorMins"])
        .concat(superSeniorsBack ? [] : ["superSeniorsBack"])
        .concat(showPrevSeasons ? [] : ["showPrevSeasons"])
        .concat(alwaysShowBench ? [] : ["alwaysShowBench"])
    ) as Record<string, string>;
  };

  // 3] Utils

  /** Sticks an overlay on top of the table if no query has ever been loaded */
  function needToLoadQuery() {
    return (
      !dataEvent.error &&
      (loadingOverride || (dataEvent?.players || []).length == 0)
    );
  }

  /** For use in selects */
  function stringToOption(s: string) {
    return { label: s, value: s };
  }

  /////////////////////////////////////

  // Team Editor specifc logic

  /** The year from which we're taking the grades - other averages need to come from that season */
  const gradeYear = (yearIn: string, offSeasonModeIn: boolean) => {
    const yearToUse = !offSeasonModeIn ? yearIn : DateUtils.getPrevYear(yearIn);
    //(basically if we're in prediction mode, we use the year before - ie what it would have looked like
    // before the season started. In "review" mode we obv use the data from that year)
    const firstYearWithFullD1Grades = DateUtils.yearFromWhichAllMenD1Imported;
    //(if we have all D1 data use the requested year, otherwise use the last full season)
    return yearIn == "All" || yearToUse < firstYearWithFullD1Grades
      ? ParamDefaults.defaultLeaderboardYear
      : yearToUse;
  };

  // Events that trigger building or rebuilding the *team* division stats cache
  useEffect(() => {
    const params = {
      ...startingState,
      gender,
      year: usePreseasonRanksOnly
        ? year
        : evalMode
        ? year
        : gradeYear(year, offSeasonMode),
    };

    if (!_.isEmpty(divisionStatsCache)) setDivisionStatsCache({}); //unset if set
    if (!_.isEmpty(preSeasonDivisionStats))
      setPreSeasonDivisionStats(overrideGrades); //unset if set

    GradeTableUtils.populateTeamDivisionStatsCache(
      params,
      (statsCache) => {
        setDivisionStatsCache(statsCache);
      },
      usePreseasonRanksOnly ? "Preseason" : undefined
    );

    if (useLastSeasonAndPreseasonRanks && !usePreseasonRanksOnly) {
      // Also go fetch pre-season grades
      const preSeasonParams = {
        ...startingState,
        gender,
        year,
      };

      GradeTableUtils.populateTeamDivisionStatsCache(
        preSeasonParams,
        (statsCache) => {
          setPreSeasonDivisionStats(statsCache.Combo);
        },
        "Preseason"
      );
    }
  }, [year, gender, evalMode, offSeasonMode]);

  // Events that trigger building or rebuilding the *player*  division stats cache
  useEffect(() => {
    if (showGrades) {
      const yearToUse = // pick the closest year for which we have data (regardless of eval mode etc)
        _.find(DateUtils.coreYears, year) ||
        (year < DateUtils.firstYearWithData
          ? DateUtils.firstYearWithData!
          : DateUtils.lastYearWithData);

      const yearOrGenderChanged =
        yearToUse != divisionStatsCache.year ||
        gender != divisionStatsCache.gender;

      if (yearOrGenderChanged || _.isEmpty(playerDivisionStatsCache)) {
        if (!_.isEmpty(playerDivisionStatsCache))
          setPlayerDivisionStatsCache({}); //unset if set
        if (!_.isEmpty(positionalStatsCache)) setPositionalStatsCache({}); //unset if set
        GradeTableUtils.populatePlayerDivisionStatsCache(
          {
            ...startingState,
            year: yearToUse,
            gender,
          },
          setPlayerDivisionStatsCache
        );
      }
      const maybePosGroup = showGrades.split(":")[2]; //(rank[:tier[:pos]])
      if (maybePosGroup && maybePosGroup != "All") {
        const posGroupStats = positionalStatsCache[maybePosGroup];
        if (yearOrGenderChanged || !posGroupStats) {
          GradeTableUtils.populatePlayerDivisionStatsCache(
            {
              year: yearToUse,
              gender,
              ...startingState,
            },
            (s: DivisionStatsCache) => {
              setPositionalStatsCache((currPosCache) => ({
                ...currPosCache,
                [maybePosGroup]: {
                  comboTier: s.Combo,
                  highTier: s.High,
                  mediumTier: s.Medium,
                  lowTier: s.Low,
                },
              }));
            },
            undefined,
            maybePosGroup
          );
        }
      }
    }
  }, [year, gender, showGrades]);

  /////////////////////////////////////

  // Build Team table

  const rosterTable = React.useMemo(() => {
    setLoadingOverride(false);

    // First time through ... Rebuild the state from the input params
    if (
      !_.isEmpty(dataEvent.players || []) &&
      //(first time only)
      !_.isNil(uiDeletedPlayersIn) &&
      !_.isNil(otherPlayerCacheIn) &&
      !_.isNil(disabledPlayersIn) &&
      !_.isNil(uiOverrides) &&
      !_.isNil(editOpenIn)
    ) {
      //TODO: there is a bug here in that if I go fetch the T100 or CONF versions of a player
      // then on page reload it will go get the original versions
      // (note converse is not true because my dataset is always the old one)
      // Options:
      // 1] mark T100/conf players in the key and then go fetch the data from those :(
      // 2] I guess store the stats in the URL :( :(
      // 3] Block use of T100/conf for now <-- this is what I've gone with

      const needToRebuildBasePlayers =
        ((startingState.deletedPlayers || "") != "" &&
          _.isEmpty(deletedPlayers)) ||
        ((startingState.addedPlayers || "") != "" &&
          _.isEmpty(otherPlayerCache)) ||
        ((startingState.disabledPlayers || "") != "" &&
          _.isEmpty(disabledPlayers)) ||
        ((startingState.overrides || "") != "" && _.isEmpty(uiOverrides)) ||
        ((startingState.editOpen || "") != "" && _.isEmpty(editOpen));

      if (startingState.deletedPlayers && _.isEmpty(deletedPlayers)) {
        const deletedPlayersSet = startingState.deletedPlayers.split(";");
        setDeletedPlayers(
          _.fromPairs(deletedPlayersSet.map((p) => [p, `code:${p}`]))
        ); //(gets filled in later)
      }
      if (startingState.disabledPlayers && _.isEmpty(disabledPlayers)) {
        const firstDisabledPlayers = _.chain(
          startingState.disabledPlayers.split(";")
        )
          .map((key) => {
            return [key, true];
          })
          .fromPairs()
          .value();
        setDisabledPlayers(firstDisabledPlayers);
      }
      if (startingState.overrides && _.isEmpty(uiOverrides)) {
        const firstOverrides = TeamEditorUtils.urlParamstoPlayerEditModels(
          startingState.overrides
        );
        setUiOverrides(firstOverrides);
      }
      if (startingState.editOpen && _.isEmpty(editOpen)) {
        const firstEditOpen = _.chain(startingState.editOpen.split(";"))
          .map((key) => {
            const keyVal = key.split("|");
            return [keyVal[0], keyVal?.[1]];
          })
          .fromPairs()
          .value();
        setEditOpen(firstEditOpen);
      }
      // This is the tricky one:
      if (startingState.addedPlayers && _.isEmpty(otherPlayerCache)) {
        const firstAddedPlayers = TeamEditorUtils.fillInAddedPlayers(
          team,
          yearWithStats,
          startingState.addedPlayers || "",
          dataEvent.players || [],
          dataEvent.transfers?.[1] || {},
          offSeasonMode,
          superSeniorsBack
        );
        setOtherPlayerCache(firstAddedPlayers);
      }

      // Clear the startingState since we've now done this once per load
      setUiDeletedPlayersIn(undefined);
      setDisabledPlayersIn(undefined);
      setOtherPlayerCacheIn(undefined);
      setUiOverridesIn(undefined);
      setEditOpenIn(undefined);

      if (needToRebuildBasePlayers) {
        //(will get called again with the right state because of the setXxx calls)
        return <div></div>;
      }
    }

    ///////////////////////////////////////////////

    // Processing - various pxResults are used in the buildXxx functions below

    const genderYearLookupForAvgEff = `${gender}_${gradeYear(
      year,
      offSeasonMode
    )}`;
    //(the year for which we are getting the grades)
    const avgEff =
      efficiencyAverages[genderYearLookupForAvgEff] ||
      efficiencyAverages.fallback;
    const genderPrevSeason = offSeasonMode
      ? `${gender}_${DateUtils.getPrevYear(yearWithStats)}`
      : "NO MATCH"; //(for Fr)

    const teamLastSeason = _.find(
      dataEvent.teamStats,
      (t) => t.team_name == team && t.year == yearWithStats
    );

    const prevYearFreshmen =
      TeamEditorManualFixes.getFreshmenForYear(genderPrevSeason);

    const pxResults = TeamEditorUtils.teamBuildingPipeline(
      gender,
      team,
      yearWithStats,
      dataEvent.players || [],
      teamLastSeason?.stats,
      dataEvent.transfers || [],
      offSeasonMode,
      evalMode,
      otherPlayerCache,
      uiOverrides,
      deletedPlayers,
      disabledPlayers,
      superSeniorsBack,
      alwaysShowBench || evalMode,
      avgEff,
      prevYearFreshmen
    );
    const avgPts100 = (100 * pxResults.teamSosDef) / (pxResults.avgEff || 1);

    ///////////////////////////////////////////////

    // Display functions

    // Filter player in/out (onlyDisable==true if undisabled as part of deleting that player)
    const togglePlayerDisabled = (
      triple: GoodBadOkTriple,
      currDisabled: Record<string, boolean>,
      onlyDisable: boolean
    ) => {
      const newDisabledPlayers = _.clone(currDisabled);
      if (currDisabled[triple.key]) {
        delete newDisabledPlayers[triple.key];
        return newDisabledPlayers;
      } else if (!onlyDisable) {
        newDisabledPlayers[triple.key] = true;
        return newDisabledPlayers;
      } else {
        //(by request, only do something if it's a disable)
        return undefined;
      }
    };
    // Filter player in/out (onlyDisable==true if undisabled as part of deleting that player)
    const togglePlayerEdited = (
      triple: GoodBadOkTriple,
      currEdited: Record<string, string>,
      onlyDisable: boolean
    ) => {
      const newEditedPlayers = _.clone(currEdited);
      if (currEdited[triple.key]) {
        delete newEditedPlayers[triple.key];
        return newEditedPlayers;
      } else if (!onlyDisable) {
        newEditedPlayers[triple.key] = "General";
        return newEditedPlayers;
      } else {
        //(by request, only do something if it's a disable)
        return undefined;
      }
    };
    const editPlayerOverrides = (
      triple: GoodBadOkTriple,
      newOverride: PlayerEditModel | undefined
    ) => {
      const newOverrides = _.clone(uiOverrides);
      if (!newOverride) {
        delete newOverrides[triple.key];
      } else {
        newOverrides[triple.key] = newOverride;
      }
      return newOverrides;
    };

    const editTooltip = (
      <Tooltip id="editTooltip">Show/hide the Player Editor tab</Tooltip>
    );
    const filterTooltip = (
      <Tooltip id="filterTooltip">
        Filter the player out from the team temporarily. You can delete them
        permanently from the Player Editor tab tab.
      </Tooltip>
    );

    const buildDataRowFromTriple = (triple: GoodBadOkTriple) => {
      const maybeOverride: PlayerEditModel | undefined =
        pxResults.unpausedOverrides[triple.key];

      const rosterInfo = triple.orig?.roster
        ? `${triple.orig.roster?.height || "?-?"} ${
            offSeasonMode && !triple.isOnlyActualResults
              ? TeamEditorUtils.getNextClass(triple.orig.roster?.year_class)
              : triple.orig.roster?.year_class
          }`
        : maybeOverride?.height
        ? `${maybeOverride.height}`
        : undefined;

      const playerLeaderboardParams = {
        tier: "All",
        year: "All",
        filter: `${triple.orig.key}:`,
        sortBy: "desc:year",
        showInfoSubHeader: true,
      };
      const lowVolumePrevSeason =
        !triple.manualProfile &&
        triple?.orig &&
        (triple?.orig?.off_team_poss_pct?.value || 0) < 0.25;
      const lowVolumeSeasonBefore =
        triple?.prevYear &&
        (triple?.prevYear?.off_team_poss_pct?.value || 0) < 0.25;
      const playerLboardTooltip = (
        <Tooltip id={`lboard_${triple.orig.code}`}>
          Open new tab showing all the player's seasons, in the multi-year
          version of the leaderboard
          {lowVolumePrevSeason || lowVolumeSeasonBefore ? (
            <p>
              <br />
              WARNING: this player may not have played qualifying minutes to
              appear in the leaderboard for one+ of their seasons. You can see
              their individual stats by selecting "History" and clicking on a
              previous season.
            </p>
          ) : null}
        </Tooltip>
      );
      const playerCareerTooltip = (
        <Tooltip id={`career_${triple.orig.code}`}>
          Open new tab showing all the player's seasons, in the Player Career
          Page
        </Tooltip>
      );
      const name = triple.orig.key;
      const maybeTransferName = otherPlayerCache[triple.key] ? (
        <i>{name}</i>
      ) : (
        name
      );

      const showLinks =
        !triple.manualProfile ||
        ((!offSeasonMode || evalMode) && triple.actualResults);
      const usePlayerCareerPage = showLinks && triple.orig.roster?.ncaa_id;
      const playerLink = showLinks ? (
        <OverlayTrigger
          placement="auto"
          overlay={
            usePlayerCareerPage ? playerCareerTooltip : playerLboardTooltip
          }
        >
          <a
            target="_blank"
            href={
              usePlayerCareerPage
                ? UrlRouting.getPlayerCareer({
                    ncaaId: triple.orig.roster?.ncaa_id,
                    gender,
                    showInfoSubHeader: true,
                  })
                : UrlRouting.getPlayerLeaderboardUrl(playerLeaderboardParams)
            }
          >
            <b>
              {maybeTransferName}
              {lowVolumePrevSeason ? <sup> !</sup> : null}
            </b>
          </a>
        </OverlayTrigger>
      ) : (
        <span>{maybeTransferName}</span>
      );

      // (In "in-season mode" always put added players in the adjusted column)
      const isAddedPlayer = !offSeasonMode && otherPlayerCache[triple.key];

      const isFiltered =
        disabledPlayers[triple.key] || triple.isOnlyActualResults; //(TODO: display some of these fields but with different formatting?)

      const hasEditPage = allEditOpen || editOpen[triple.key];

      const okProdFactor = factorMins
        ? triple.ok.off_team_poss_pct?.value || 0
        : 1.0;
      const goodProdFactor = factorMins
        ? triple.good.off_team_poss_pct?.value || 0
        : 1.0;
      const badProdFactor = factorMins
        ? triple.bad.off_team_poss_pct?.value || 0
        : 1.0;
      const actualProdFactor =
        factorMins && triple.actualResults
          ? triple.actualResults.off_team_poss_pct?.value || 0
          : 1.0;
      const origProdFactor = factorMins
        ? triple.orig.off_team_poss_pct?.value || 0
        : 1.0;
      const origPrevProdFactor =
        factorMins && triple.prevYear
          ? triple.prevYear.off_team_poss_pct?.value || 0
          : 1.0;

      const injectTransferOverlay = (text: String, season: IndivStatSet) => {
        const teamParams = {
          team: season.team,
          gender: gender,
          year: season.year,
          minRank: "0",
          maxRank: "400",
          factorMins: factorMins,
          possAsPct: true,
          showExpanded: true,
          calcRapm: true,
          showGrades: "rank:D1",
          showTeamPlayTypes: false,
          showRoster: false,
          showExtraInfo: false,
          filter: `${season.key};`,
        };
        if (season.team != team) {
          return (
            <OverlayTrigger
              placement="auto"
              overlay={
                <Tooltip id={`transfer_${season.year}`}>
                  Playing at {season.team}{" "}
                  {season.conf ? `(${season.conf})` : ""}
                  <br />
                  Click to view their individual stats in the Team Analysis
                  Page.
                </Tooltip>
              }
            >
              <span>
                <a target="_blank" href={UrlRouting.getGameUrl(teamParams, {})}>
                  {text}
                </a>
                <sup>*</sup>
              </span>
            </OverlayTrigger>
          );
        } else {
          return (
            <OverlayTrigger
              placement="auto"
              overlay={
                <Tooltip id={`nontransfer_${season.year}`}>
                  Click to view their individual stats in the Team Analysis
                  Page.
                </Tooltip>
              }
            >
              <span>
                <a target="_blank" href={UrlRouting.getGameUrl(teamParams, {})}>
                  {text}
                </a>
              </span>
            </OverlayTrigger>
          );
        }
      };
      const prevSeasonEl =
        showPrevSeasons && offSeasonMode && !triple.manualProfile && !isFiltered
          ? {
              title: (
                <small>
                  <i>{injectTransferOverlay("Previous season", triple.orig)}</i>
                </small>
              ),
              mpg: { value: (triple.orig.off_team_poss_pct?.value || 0) * 40 },
              ptsPlus: factorMins
                ? {
                    value:
                      (triple.orig.off_rtg?.value || 0) *
                      (triple.orig.off_usage?.value || 0) *
                      (triple.orig.off_team_poss_pct?.value || 0) *
                      (DerivedStatsUtils.injectPaceStats(triple.orig, {}, true)[
                        "tempo"
                      ]?.value || 0) *
                      0.01,
                  }
                : undefined,
              ortg: triple.orig.off_rtg,
              usage: triple.orig.off_usage,
              rebound: { value: triple.orig.def_orb?.value },
              ok_net: {
                value: TeamEditorUtils.getNet(triple.orig, origProdFactor),
              },
              ok_off: {
                value: TeamEditorUtils.getOff(triple.orig, origProdFactor),
              },
              ok_def: {
                value: TeamEditorUtils.getDef(triple.orig, origProdFactor),
              },
            }
          : undefined;

      const prevPrevSeasonEl =
        showPrevSeasons && triple.prevYear && !isFiltered
          ? {
              title: (
                <small>
                  <i>
                    {injectTransferOverlay("Season before", triple.prevYear)}
                  </i>
                </small>
              ),
              mpg: {
                value: (triple.prevYear.off_team_poss_pct?.value || 0) * 40,
              },
              ptsPlus: factorMins
                ? {
                    value:
                      (triple.prevYear.off_rtg?.value || 0) *
                      (triple.prevYear.off_usage?.value || 0) *
                      (triple.prevYear.off_team_poss_pct?.value || 0) *
                      (DerivedStatsUtils.injectPaceStats(
                        triple.prevYear,
                        {},
                        true
                      )["tempo"]?.value || 0) *
                      0.01,
                  }
                : undefined,
              ortg: triple.prevYear.off_rtg,
              usage: triple.prevYear.off_usage,
              rebound: { value: triple.prevYear.def_orb?.value },
              ok_net: {
                value: TeamEditorUtils.getNet(
                  triple.prevYear,
                  origPrevProdFactor
                ),
              },
              ok_off: {
                value: TeamEditorUtils.getOff(
                  triple.prevYear,
                  origPrevProdFactor
                ),
              },
              ok_def: {
                value: TeamEditorUtils.getDef(
                  triple.prevYear,
                  origPrevProdFactor
                ),
              },
            }
          : undefined;

      const extraInfoOffObj = _.isNil(maybeOverride?.global_off_adj)
        ? {}
        : { extraInfo: `Manually adjusted, see Player Editor tab` };
      const extraInfoDefObj = _.isNil(maybeOverride?.global_def_adj)
        ? {}
        : { extraInfo: `Manually adjusted, see Player Editor tab` };
      const extraInfoNetObj =
        _.isNil(maybeOverride?.global_off_adj) &&
        _.isNil(maybeOverride?.global_def_adj)
          ? {}
          : { extraInfo: `Manually adjusted, see Player Editor tab` };

      const nilToUse = _.isNil(maybeOverride?.nil)
        ? triple.nil
        : maybeOverride?.nil;

      const okNet = TeamEditorUtils.getNet(triple.ok, okProdFactor);
      const okOff = TeamEditorUtils.getOff(triple.ok, okProdFactor);
      const okDef = TeamEditorUtils.getDef(triple.ok, okProdFactor);

      const origNet = offSeasonMode
        ? undefined
        : TeamEditorUtils.getNet(triple.orig, origProdFactor);
      const origOff = offSeasonMode
        ? undefined
        : TeamEditorUtils.getOff(triple.orig, origProdFactor);
      const origDef = offSeasonMode
        ? undefined
        : TeamEditorUtils.getDef(triple.orig, origProdFactor);

      const origNotEqualOk = offSeasonMode
        ? false
        : okDef != origDef || okOff != origOff;

      const approxPtsCalc = triple.ok.off_rtg
        ? (triple.ok.off_rtg?.value || 0) *
          (triple.ok.off_usage?.value || 0) *
          okProdFactor
        : avgPts100 * 0.2 * okProdFactor + okNet;

      const tableEl = {
        title: (
          <span>
            {rosterInfo ? <i>{rosterInfo}&nbsp;/&nbsp;</i> : null}
            {playerLink}
          </span>
        ),
        actual_mpg:
          evalMode && triple.actualResults
            ? {
                value:
                  (triple.actualResults.off_team_poss_pct?.value || 0) * 40,
              }
            : offSeasonMode
            ? undefined
            : { value: (triple.orig.off_team_poss_pct?.value || 0) * 40 },
        mpg: isFiltered
          ? undefined
          : {
              value: (triple.ok.off_team_poss_pct?.value || 0) * 40,
              extraInfo: _.isNil(maybeOverride?.mins)
                ? undefined
                : "Overridden, see Player Editor tab",
            },
        nil: _.isNil(nilToUse) ? undefined : (
          <small>
            <i>{nilToUse.toFixed(0)}</i>
          </small>
        ),
        ortg: triple.ok.off_rtg,
        ptsPlus: factorMins ? { value: approxPtsCalc * 0.7 } : undefined, //TODO, make this be the average team tempo
        usage: triple.ok.off_usage,
        rebound:
          isFiltered || !triple.ok.def_orb
            ? undefined
            : { value: triple.ok.def_orb?.value },

        act_caliber:
          caliberMode && triple.actualResults
            ? {
                value: TeamEditorUtils.getNet(triple.actualResults, 1.0),
              }
            : undefined,
        caliber: caliberMode
          ? {
              value: okNet,
            }
          : undefined,

        pos: (
          <span style={{ whiteSpace: "nowrap" }}>{triple.orig.posClass}</span>
        ),

        actual_net:
          evalMode && triple.actualResults
            ? {
                value: TeamEditorUtils.getNet(
                  triple.actualResults,
                  actualProdFactor
                ),
              }
            : undefined,
        actual_off:
          evalMode && triple.actualResults
            ? {
                value: TeamEditorUtils.getOff(
                  triple.actualResults,
                  actualProdFactor
                ),
              }
            : undefined,
        actual_def:
          evalMode && triple.actualResults
            ? {
                value: TeamEditorUtils.getDef(
                  triple.actualResults,
                  actualProdFactor
                ),
              }
            : undefined,

        // In in-season mode, it's the adjusted if different
        good_net: isFiltered
          ? undefined
          : offSeasonMode
          ? {
              value: TeamEditorUtils.getNet(triple.good, goodProdFactor),
              ...extraInfoNetObj,
            }
          : origNotEqualOk || isAddedPlayer
          ? { value: okNet }
          : undefined,
        good_off: isFiltered
          ? undefined
          : offSeasonMode
          ? {
              value: TeamEditorUtils.getOff(triple.good, goodProdFactor),
              ...extraInfoOffObj,
            }
          : origNotEqualOk || isAddedPlayer
          ? { value: okOff }
          : undefined,
        good_def: isFiltered
          ? undefined
          : offSeasonMode
          ? {
              value: TeamEditorUtils.getDef(triple.good, goodProdFactor),
              ...extraInfoDefObj,
            }
          : origNotEqualOk || isAddedPlayer
          ? { value: okDef }
          : undefined,

        // In in-season mode, it's the original if different
        ok_net:
          (isFiltered && offSeasonMode) || isAddedPlayer
            ? undefined
            : offSeasonMode
            ? { value: okNet, ...extraInfoNetObj }
            : { value: origNet },
        ok_off:
          (isFiltered && offSeasonMode) || isAddedPlayer
            ? undefined
            : offSeasonMode
            ? { value: okOff, ...extraInfoOffObj }
            : { value: origOff },
        ok_def:
          (isFiltered && offSeasonMode) || isAddedPlayer
            ? undefined
            : offSeasonMode
            ? { value: okDef, ...extraInfoDefObj }
            : { value: origDef },

        bad_net:
          isFiltered || !offSeasonMode
            ? undefined
            : {
                value: TeamEditorUtils.getNet(triple.bad, badProdFactor),
                ...extraInfoNetObj,
              },
        bad_off:
          isFiltered || !offSeasonMode
            ? undefined
            : {
                value: TeamEditorUtils.getOff(triple.bad, badProdFactor),
                ...extraInfoOffObj,
              },
        bad_def:
          isFiltered || !offSeasonMode
            ? undefined
            : {
                value: TeamEditorUtils.getDef(triple.bad, badProdFactor),
                ...extraInfoDefObj,
              },

        edit: (
          <OverlayTrigger overlay={editTooltip} placement="auto">
            <Button
              variant={hasEditPage ? "secondary" : "outline-secondary"}
              size="sm"
              onClick={(ev: any) => {
                const newEditOpen = togglePlayerEdited(triple, editOpen, false);
                if (newEditOpen) {
                  setEditOpen(newEditOpen);
                }
              }}
            >
              <FontAwesomeIcon icon={faPen} />
            </Button>
          </OverlayTrigger>
        ),
        disable: (
          <OverlayTrigger overlay={filterTooltip} placement="auto">
            <Button
              variant={
                disabledPlayers[triple.key] ? "secondary" : "outline-secondary"
              }
              size="sm"
              onClick={(ev: any) => {
                //(insta do this - the visual clue should be sufficient)
                const newDisabledPlayers = togglePlayerDisabled(
                  triple,
                  disabledPlayers,
                  false
                );
                if (newDisabledPlayers) {
                  setDisabledPlayers(newDisabledPlayers);
                }
              }}
            >
              <FontAwesomeIcon icon={faFilter} />
            </Button>
          </OverlayTrigger>
        ),
      };

      const playerGradesEl = showGrades
        ? _.take(
            GradeTableUtils.buildProjectedPlayerGradeTableRows({
              selectionTitle: `Projected Grades`,
              config: showGrades,
              setConfig: (newConfig: string) => {
                setShowGrades(newConfig);
              },
              playerStats: {
                comboTier: playerDivisionStatsCache.Combo,
                highTier: playerDivisionStatsCache.High,
                mediumTier: playerDivisionStatsCache.Medium,
                lowTier: playerDivisionStatsCache.Low,
              },
              playerPosStats: positionalStatsCache,

              code: triple.key,
              playerProjections: tableEl as PureStatSet,
              evalMode,
              offSeasonMode,
              factorMins,
              caliberMode,
              enableNil,
            }),
            1
          ) //(skip the control row)
        : undefined;

      return (
        allEditOpen ? [GenericTableOps.buildHeaderRepeatRow({}, "small")] : []
      )
        .concat([
          GenericTableOps.buildDataRow(
            tableEl,
            GenericTableOps.defaultFormatter,
            GenericTableOps.defaultCellMeta
          ),
        ])
        .concat(playerGradesEl || [])
        .concat(
          showPrevSeasons && prevSeasonEl
            ? [
                GenericTableOps.buildDataRow(
                  prevSeasonEl,
                  GenericTableOps.defaultFormatter,
                  GenericTableOps.defaultCellMeta
                ),
              ]
            : []
        )
        .concat(
          showPrevSeasons && prevPrevSeasonEl
            ? [
                GenericTableOps.buildDataRow(
                  prevPrevSeasonEl,
                  GenericTableOps.defaultFormatter,
                  GenericTableOps.defaultCellMeta
                ),
              ]
            : []
        )
        .concat(
          hasEditPage
            ? [
                GenericTableOps.buildTextRow(
                  <TeamRosterEditor
                    isBench={false}
                    enableNil={enableNil}
                    addNewPlayerMode={false}
                    overrides={pxResults.allOverrides[triple.key]}
                    onUpdate={(edit: PlayerEditModel | undefined) => {
                      friendlyChange(() => {
                        setUiOverrides(editPlayerOverrides(triple, edit));
                      }, true);
                    }}
                    onDelete={() => {
                      const tidyUp = (
                        currDisabledPlayers: Record<string, boolean>,
                        currEditedPlayers: Record<string, string>,
                        currOverrides: Record<string, PlayerEditModel>
                      ) => {
                        // Tidy up activity: remove from disabled/edited players set
                        const newDisabledPlayers = togglePlayerDisabled(
                          triple,
                          currDisabledPlayers,
                          true
                        );
                        if (newDisabledPlayers) {
                          setDisabledPlayers(newDisabledPlayers);
                        }
                        const newEditOpen = togglePlayerEdited(
                          triple,
                          currEditedPlayers,
                          false
                        );
                        if (newEditOpen) {
                          setEditOpen(newEditOpen);
                        }
                        setUiOverrides(editPlayerOverrides(triple, undefined));
                      };
                      if (otherPlayerCache[triple.key]) {
                        const newOtherPlayerCache = _.clone(otherPlayerCache);
                        delete newOtherPlayerCache[triple.key];
                        friendlyChange(() => {
                          setOtherPlayerCache(newOtherPlayerCache);
                          tidyUp(disabledPlayers, editOpen, uiOverrides);
                        }, true);
                      } else {
                        const newDeletedPlayers = _.clone(deletedPlayers);
                        newDeletedPlayers[triple.key] = triple.orig.key;
                        friendlyChange(() => {
                          if (!uiOverrides[triple.key]?.name) {
                            //(else just needs to be cleared from overrides below)
                            //(allOverrides, I _do_ need to include it since it could be a Fr which is injected via other means)
                            setDeletedPlayers(newDeletedPlayers);
                          }
                          tidyUp(disabledPlayers, editOpen, uiOverrides);
                        }, true);
                      }
                    }}
                  />,
                  "small"
                ),
                GenericTableOps.buildRowSeparator(),
              ]
            : []
        )
        .concat(
          debugMode
            ? [
                GenericTableOps.buildTextRow(
                  JSON.stringify(
                    _.omit(triple.diag, ["off_usage"]),
                    reduceNumberSize
                  ),
                  "small"
                ),
              ]
            : []
        );
    };
    const buildBenchDataRowFromTriple = (
      benchName: string,
      tripleIn: GoodBadOkTriple | undefined
    ) => {
      const benchOverrides = tripleIn
        ? pxResults.allOverrides[tripleIn.key]
        : undefined;

      const hasEditPage =
        allEditOpen || (tripleIn ? editOpen[tripleIn.key] : false);

      const tableEl = _.thru(tripleIn, (triple) => {
        if (triple) {
          const mpg = (triple.ok.off_team_poss_pct?.value || 0) * 40;
          const isFiltered = mpg == 0;

          const okProdFactor = factorMins
            ? triple.ok.off_team_poss_pct?.value || 0
            : 1.0;
          const goodProdFactor = factorMins
            ? triple.good.off_team_poss_pct?.value || 0
            : 1.0;
          const badProdFactor = factorMins
            ? triple.bad.off_team_poss_pct?.value || 0
            : 1.0;

          const benchOffOver =
            (benchOverrides?.global_off_adj || 0) * okProdFactor;
          const benchDefOver =
            (benchOverrides?.global_def_adj || 0) * okProdFactor;
          const hasBenchOverride = benchOffOver != 0 || benchDefOver != 0;
          const showCol = offSeasonMode || hasBenchOverride;

          const okNet = offSeasonMode
            ? TeamEditorUtils.getNet(triple.ok, okProdFactor)
            : TeamEditorUtils.getNet(triple.ok, okProdFactor) -
              (benchOffOver - benchDefOver);

          return {
            title: <b>{triple.orig.key}</b>,
            mpg: { value: mpg },
            nil: _.isNil(triple.nil) ? undefined : (
              <small>
                <i>{triple.nil.toFixed(0)}</i>
              </small>
            ),
            act_caliber:
              caliberMode && triple.actualResults
                ? { value: TeamEditorUtils.getNet(triple.actualResults, 1.0) }
                : undefined,

            caliber: caliberMode
              ? { value: TeamEditorUtils.getNet(triple.ok, 1.0) }
              : undefined,

            ptsPlus: factorMins
              ? { value: (avgPts100 * 0.2 * okProdFactor + okNet) * 0.7 }
              : undefined, //TODO: calc poss/g

            actual_net: !triple.actualResults
              ? undefined
              : { value: TeamEditorUtils.getNet(triple.actualResults, 1.0) },
            actual_off: !triple.actualResults
              ? undefined
              : { value: TeamEditorUtils.getOff(triple.actualResults, 1.0) },
            actual_def: !triple.actualResults
              ? undefined
              : { value: TeamEditorUtils.getDef(triple.actualResults, 1.0) },
            actual_mpg: !triple.actualResults
              ? undefined
              : {
                  value:
                    (triple.actualResults.off_team_poss_pct?.value || 0) * 40,
                },

            good_net:
              isFiltered || !showCol
                ? undefined
                : offSeasonMode
                ? { value: TeamEditorUtils.getNet(triple.good, goodProdFactor) }
                : { value: TeamEditorUtils.getNet(triple.ok, okProdFactor) },
            good_off:
              isFiltered || !showCol
                ? undefined
                : offSeasonMode
                ? { value: TeamEditorUtils.getOff(triple.good, goodProdFactor) }
                : { value: TeamEditorUtils.getOff(triple.ok, okProdFactor) },
            good_def:
              isFiltered || !showCol
                ? undefined
                : offSeasonMode
                ? { value: TeamEditorUtils.getDef(triple.good, goodProdFactor) }
                : { value: TeamEditorUtils.getDef(triple.ok, okProdFactor) },
            ok_net: isFiltered ? undefined : { value: okNet },
            ok_off: isFiltered
              ? undefined
              : offSeasonMode
              ? { value: TeamEditorUtils.getOff(triple.ok, okProdFactor) }
              : {
                  value:
                    TeamEditorUtils.getOff(triple.ok, okProdFactor) -
                    benchOffOver,
                },
            ok_def: isFiltered
              ? undefined
              : offSeasonMode
              ? { value: TeamEditorUtils.getDef(triple.ok, okProdFactor) }
              : {
                  value:
                    TeamEditorUtils.getDef(triple.ok, okProdFactor) +
                    benchDefOver,
                },
            bad_net:
              isFiltered || !offSeasonMode
                ? undefined
                : { value: TeamEditorUtils.getNet(triple.bad, badProdFactor) },
            bad_off:
              isFiltered || !offSeasonMode
                ? undefined
                : { value: TeamEditorUtils.getOff(triple.bad, badProdFactor) },
            bad_def:
              isFiltered || !offSeasonMode
                ? undefined
                : { value: TeamEditorUtils.getDef(triple.bad, badProdFactor) },
            edit: (
              <OverlayTrigger overlay={editTooltip} placement="auto">
                <Button
                  variant={hasEditPage ? "secondary" : "outline-secondary"}
                  size="sm"
                  onClick={(ev: any) => {
                    const newEditOpen = togglePlayerEdited(
                      triple,
                      editOpen,
                      false
                    );
                    if (newEditOpen) {
                      setEditOpen(newEditOpen);
                    }
                  }}
                >
                  <FontAwesomeIcon icon={faPen} />
                </Button>
              </OverlayTrigger>
            ),
          };
        } else {
          return {};
        }
      });

      // If grades are enabled, then add a control row immediately befpre the bench info:
      const benchGradesEl = showGrades
        ? _.takeRight(
            GradeTableUtils.buildProjectedPlayerGradeTableRows({
              selectionTitle: `Projected Grades`,
              config: showGrades,
              setConfig: (newConfig: string) => {
                setShowGrades(newConfig);
              },
              playerStats: {
                comboTier: playerDivisionStatsCache.Combo,
                highTier: playerDivisionStatsCache.High,
                mediumTier: playerDivisionStatsCache.Medium,
                lowTier: playerDivisionStatsCache.Low,
              },
              playerPosStats: positionalStatsCache,

              code: benchName,
              playerProjections: tableEl as PureStatSet,
              evalMode,
              offSeasonMode,
              factorMins,
              caliberMode,
              enableNil,
            }),
            1
          ) //(skip bench grades, the aren't super useful because low minutes and lots of garbage minutes etc)
        : undefined;

      return (benchGradesEl || [])
        .concat(
          tableEl
            ? [
                GenericTableOps.buildDataRow(
                  tableEl,
                  GenericTableOps.defaultFormatter,
                  GenericTableOps.defaultCellMeta
                ),
              ]
            : []
        )
        .concat(
          hasEditPage && tripleIn
            ? [
                GenericTableOps.buildTextRow(
                  <TeamRosterEditor
                    isBench={true}
                    enableNil={enableNil}
                    addNewPlayerMode={false}
                    overrides={benchOverrides}
                    onUpdate={(edit: PlayerEditModel | undefined) => {
                      friendlyChange(() => {
                        setUiOverrides(editPlayerOverrides(tripleIn, edit));
                      }, true);
                    }}
                    onDelete={() => null}
                  />,
                  "small"
                ),
                GenericTableOps.buildRowSeparator(),
              ]
            : []
        )
        .concat(
          debugMode && tripleIn
            ? [
                GenericTableOps.buildTextRow(
                  JSON.stringify(
                    _.omit(tripleIn.diag, ["off_rtg", "off_usage"]),
                    reduceNumberSize
                  ),
                  "small"
                ),
              ]
            : []
        );
    };
    const buildPosHeaderRow = (posName: string, pct: number) =>
      GenericTableOps.buildSubHeaderRow(
        evalMode
          ? [
              [<div />, enableNil ? 7 : 6],
              [<div />, 4],
              [<div />, 1],
              [
                <div>
                  <b>{posName}</b> ({(100 * pct).toFixed(0)}%)
                </div>,
                4,
              ],
              [<div />, 1],
              [<div />, 12],
            ]
          : [
              [<div />, (enableNil ? 10 : 9) + (offSeasonMode ? 0 : 1)],
              [
                <div>
                  <b>{posName}</b> ({(100 * pct).toFixed(0)}%)
                </div>,
                4,
              ],
              [<div />, 1],
              [<div />, 12],
            ],
        "small text-center"
      );

    /** actualResultsForReview / inSeasonPlayerResultsList are basically the same thing, except the former comes in
     * offSeasonMode+evalMode whereas the latter comes in !offSeasonMode
     * (mutates the bench, adding "actual" based on summing the data)
     * TODO: merge them at some point
     */
    const buildTeamRows = (
      actualResultsForReview: GoodBadOkTriple[],
      inSeasonPlayerResultsList: GoodBadOkTriple[] | undefined,
      mutableBench: GoodBadOkTriple[],
      avgEff: number
    ) => {
      const filteredPlayerSet = TeamEditorUtils.getFilteredPlayersWithBench(
        pxResults,
        disabledPlayers
      );

      //(Diagnostic - will display if it's <0)
      const totalMins =
        _.sumBy(filteredPlayerSet, (p) => p.ok.off_team_poss_pct.value!) * 0.2;
      const totalNil = enableNil
        ? _.sumBy(filteredPlayerSet, (triple) => {
            const maybeOverride: PlayerEditModel | undefined =
              pxResults.unpausedOverrides[triple.key];
            const nilToUse = _.isNil(maybeOverride?.nil)
              ? triple.nil
              : maybeOverride?.nil;
            return nilToUse || 0;
          })
        : 0;
      const totalActualMins = evalMode
        ? _.sumBy(
            actualResultsForReview,
            (p) => p.orig.off_team_poss_pct.value!
          ) * 0.2
        : undefined;
      const finalActualEffAdj = totalActualMins
        ? 5.0 *
          Math.max(0, 1.0 - totalActualMins) *
          TeamEditorUtils.getBenchLevelScoring(team, yearWithStats)
        : 0;

      const depthBonus = TeamEditorUtils.calcDepthBonus(
        filteredPlayerSet,
        team
      );

      //Depth diag:
      //console.log(`Team depth bonus: [${team}], off=[${depthBonus.off.toFixed(2)}] def=[${depthBonus.def.toFixed(2)}] net=[${(depthBonus.off-depthBonus.def).toFixed(2)}]`);

      const okTotals = TeamEditorUtils.buildTotals(
        filteredPlayerSet,
        "ok",
        depthBonus
      );

      // Off-season and eval mode only: good and bad vs neutral ... In-season: ok vs orig
      const stdDevFactor = 1.0 / Math.sqrt(5); //(1 std dev, so divide by root of team size)
      const goodRange = offSeasonMode
        ? TeamEditorUtils.buildTotals(filteredPlayerSet, "good", depthBonus)
        : okTotals;
      const badRange = offSeasonMode
        ? TeamEditorUtils.buildTotals(filteredPlayerSet, "bad", depthBonus)
        : okTotals;
      //(ignore in in-season mode)
      const goodDeltaNet = (goodRange.net - okTotals.net) * stdDevFactor;
      const goodDeltaOff = (goodRange.off - okTotals.off) * stdDevFactor;
      const goodDeltaDef = (goodRange.def - okTotals.def) * stdDevFactor;
      const badDeltaNet = (badRange.net - okTotals.net) * stdDevFactor;
      const badDeltaOff = (badRange.off - okTotals.off) * stdDevFactor;
      const badDeltaDef = (badRange.def - okTotals.def) * stdDevFactor;
      //(in-season)
      const origTotals = offSeasonMode
        ? okTotals
        : TeamEditorUtils.buildTotals(filteredPlayerSet, "orig", depthBonus);
      const inSeasonDeltaNet = okTotals.net - origTotals.net;
      const inSeasonDeltaOff = okTotals.off - origTotals.off;
      const inSeasonDeltaDef = okTotals.def - origTotals.def;

      // In-season mode only
      const rawTotalMins = inSeasonPlayerResultsList
        ? _.sumBy(
            inSeasonPlayerResultsList,
            (p) => p.orig?.off_team_poss_pct.value || 0
          )
        : 5.0;
      const getRawBenchLevel =
        Math.max(0, 5.0 - rawTotalMins) *
        TeamEditorUtils.getBenchLevelScoring(team, yearWithStats);
      const rawNetSum = inSeasonPlayerResultsList
        ? _.sumBy(
            inSeasonPlayerResultsList,
            (p) =>
              (p.orig?.off_team_poss_pct.value || 0) *
              TeamEditorUtils.getNet(p.orig)
          ) +
          2 * getRawBenchLevel
        : undefined;
      const rawOffSum = inSeasonPlayerResultsList
        ? _.sumBy(
            inSeasonPlayerResultsList,
            (p) =>
              (p.orig?.off_team_poss_pct.value || 0) *
              TeamEditorUtils.getOff(p.orig)
          ) + getRawBenchLevel
        : undefined;
      const rawDefSum = inSeasonPlayerResultsList
        ? _.sumBy(
            inSeasonPlayerResultsList,
            (p) =>
              (p.orig?.off_team_poss_pct.value || 0) *
              TeamEditorUtils.getDef(p.orig)
          ) - getRawBenchLevel
        : undefined;
      // Avoid bench adjustment weirdness until user does something
      const somethingHasChanged =
        inSeasonDeltaNet > 0 ||
        !_.isEmpty(deletedPlayers) ||
        !_.isEmpty(otherPlayerCache) ||
        !_.isEmpty(disabledPlayers);
      const adjustedNetSum = somethingHasChanged ? goodRange.net : rawNetSum;
      const adjustedOffSum = somethingHasChanged ? goodRange.off : rawOffSum;
      const adjustedDefSum = somethingHasChanged ? goodRange.def : rawDefSum;

      const dummyTeamOk = {
        //(in "in-season" mode, reports the original values)
        off_net: !_.isNil(rawNetSum)
          ? { value: rawNetSum }
          : { value: okTotals.net },
        off_adj_ppp: !_.isNil(rawOffSum)
          ? { value: rawOffSum + avgEff }
          : { value: okTotals.off + avgEff },
        def_adj_ppp: !_.isNil(rawDefSum)
          ? { value: rawDefSum + avgEff }
          : { value: okTotals.def + avgEff },
      };
      const dummyTeamGood = {
        // //(in "in-season" mode, reports the adjusted values)
        off_net: !_.isNil(rawNetSum)
          ? { value: adjustedNetSum }
          : { value: okTotals.net + goodDeltaNet },
        off_adj_ppp: !_.isNil(rawOffSum)
          ? { value: adjustedOffSum! + avgEff }
          : { value: okTotals.off + avgEff + goodDeltaOff },
        def_adj_ppp: !_.isNil(rawDefSum)
          ? { value: adjustedDefSum! + avgEff }
          : { value: okTotals.def + avgEff + goodDeltaDef },
      };
      const dummyTeamBad = {
        off_net: { value: okTotals.net + badDeltaNet },
        off_adj_ppp: { value: okTotals.off + avgEff + badDeltaOff },
        def_adj_ppp: { value: okTotals.def + avgEff + badDeltaDef },
      };

      const currOrPrevSeasonGrades =
        divisionStatsCache.Combo || divisionStatsCache.High;

      const teamGradesOk = currOrPrevSeasonGrades
        ? GradeUtils.buildTeamPercentiles(
            currOrPrevSeasonGrades,
            dummyTeamOk,
            ["net", "adj_ppp"],
            true
          )
        : {};
      const teamGradesGood = currOrPrevSeasonGrades
        ? GradeUtils.buildTeamPercentiles(
            currOrPrevSeasonGrades,
            dummyTeamGood,
            ["net", "adj_ppp"],
            true
          )
        : {};
      const teamGradesBad = currOrPrevSeasonGrades
        ? GradeUtils.buildTeamPercentiles(
            currOrPrevSeasonGrades,
            dummyTeamBad,
            ["net", "adj_ppp"],
            true
          )
        : {};

      const teamGradesOkNextYear = preSeasonDivisionStats
        ? GradeUtils.buildTeamPercentiles(
            preSeasonDivisionStats,
            dummyTeamOk,
            ["net", "adj_ppp"],
            true
          )
        : {};
      const teamGradesGoodNextYear = preSeasonDivisionStats
        ? GradeUtils.buildTeamPercentiles(
            preSeasonDivisionStats,
            dummyTeamGood,
            ["net", "adj_ppp"],
            true
          )
        : {};
      const teamGradesBadNextYear = preSeasonDivisionStats
        ? GradeUtils.buildTeamPercentiles(
            preSeasonDivisionStats,
            dummyTeamBad,
            ["net", "adj_ppp"],
            true
          )
        : {};

      // Use measured team efficiency if it exists, else fallback to legacy (calculate from sum of qualifying players)

      //TODO: other adjustments based on this new logic...(calc/display bench production)

      const actualTotalsFromTeam = evalMode
        ? _.find(
            dataEvent.teamStats,
            (t) =>
              t.team_name == team &&
              t.year == DateUtils.getNextYear(yearWithStats)
          )
        : undefined;

      const getLuckAdjOrRaw = (s: Statistic | undefined) =>
        (_.isNil(s?.old_value) ? s?.value : s?.old_value) || avgEff;
      const getRaw = (s: Statistic | undefined) => s?.value || avgEff;
      const dummyTeamActualFromTeamNoLuck = actualTotalsFromTeam
        ? {
            off_net: {
              value:
                getLuckAdjOrRaw(actualTotalsFromTeam.stats.off_adj_ppp) -
                getLuckAdjOrRaw(actualTotalsFromTeam.stats.def_adj_ppp),
              extraInfo: !_.isNil(
                actualTotalsFromTeam.stats.def_adj_ppp.old_value
              ) ? (
                <i>
                  Luck adjusted (used in projections): [
                  {(
                    getRaw(actualTotalsFromTeam.stats.off_adj_ppp) -
                    getRaw(actualTotalsFromTeam.stats.def_adj_ppp)
                  ).toFixed(1)}
                  ]
                </i>
              ) : null,
            },
            off_adj_ppp: {
              value: getLuckAdjOrRaw(actualTotalsFromTeam.stats.off_adj_ppp),
            },
            def_adj_ppp: {
              value: getLuckAdjOrRaw(actualTotalsFromTeam.stats.def_adj_ppp),
              extraInfo: !_.isNil(
                actualTotalsFromTeam.stats.def_adj_ppp.old_value
              ) ? (
                <i>
                  Luck adjusted (used in projections): [
                  {getRaw(actualTotalsFromTeam.stats.def_adj_ppp).toFixed(1)}]
                </i>
              ) : null,
            },
          }
        : undefined;

      const actualTotalsFromPlayers =
        evalMode && !actualTotalsFromTeam
          ? TeamEditorUtils.buildTotals(
              pxResults.actualResultsForReview,
              "orig",
              depthBonus,
              finalActualEffAdj
            )
          : undefined;
      const dummyTeamActualFromPlayers = actualTotalsFromPlayers
        ? {
            off_net: { value: actualTotalsFromPlayers.net },
            off_adj_ppp: { value: actualTotalsFromPlayers.off + avgEff },
            def_adj_ppp: { value: actualTotalsFromPlayers.def + avgEff },
          }
        : undefined;
      const dummyTeamActual =
        dummyTeamActualFromTeamNoLuck || dummyTeamActualFromPlayers;

      const teamGradesActual =
        dummyTeamActual && currOrPrevSeasonGrades
          ? GradeUtils.buildTeamPercentiles(
              currOrPrevSeasonGrades,
              dummyTeamActual,
              ["net", "adj_ppp"],
              true
            )
          : {};

      const teamGradesActualVsProj =
        dummyTeamActual &&
        preSeasonDivisionStats &&
        useLastSeasonAndPreseasonRanks
          ? GradeUtils.buildTeamPercentiles(
              preSeasonDivisionStats,
              dummyTeamActual,
              ["net", "adj_ppp"],
              true
            )
          : {};

      const actualBenchInfo = actualTotalsFromTeam
        ? TeamEditorUtils.calcActualBenchProduction(
            actualTotalsFromTeam.stats,
            pxResults.actualResultsForReview,
            avgEff
          )
        : undefined;

      if (actualBenchInfo) {
        //(enrich the existing bench info with actual results)
        mutableBench.forEach((b) => (b.actualResults = actualBenchInfo));
      }

      const teamParams = {
        team: team,
        gender: gender,
        year: offSeasonMode ? DateUtils.getLastSeasonWithDataFrom(year) : year,
        //(unless this is the last off-season, seems more natural to link to what actually happened for the selected year)
        minRank: "0",
        maxRank: "400",
        factorMins: factorMins,
        possAsPct: true,
        showExpanded: true,
        calcRapm: true,
        showGrades: "rank:D1",
        showTeamPlayTypes: true,
        showRoster: true,
        showExtraInfo: true,
      };
      const teamTooltip = (
        <Tooltip id={`teamTooltip`}>
          Show in a new tab a table with all these players' stats <i>last</i>{" "}
          season
        </Tooltip>
      );

      const teamLinkUrl =
        offSeasonMode && !evalMode
          ? UrlRouting.getPlayerLeaderboardUrl({
              tier: "All",
              filter: _.flatten([
                pxResults.rosterGuards,
                pxResults.rosterWings,
                pxResults.rosterBigs,
              ])
                .filter((triple) => triple.orig)
                .filter((triple) => !disabledPlayers[triple.key])
                .map((triple) => {
                  if (triple.orig.roster?.ncaa_id) {
                    return triple.orig.code
                      ? `${triple.orig.code}_${triple.orig.roster?.ncaa_id}`
                      : `${triple.orig.roster?.ncaa_id}`;
                  } else if (triple.orig.code && triple.orig.team) {
                    return `_${triple.orig.code}:${triple.orig.team}`;
                  } else {
                    return `${triple.orig.key}:`;
                  }
                })
                .join("; "),
            })
          : UrlRouting.getGameUrl(teamParams, {}); //(TODO: are there off-season cases we want the Game URL as well?)
      const teamLink = team ? (
        <OverlayTrigger placement="auto" overlay={teamTooltip}>
          <a target="_blank" href={teamLinkUrl}>
            <b>Team Totals</b>
          </a>
        </OverlayTrigger>
      ) : (
        <b>Team Totals</b>
      );

      const actualResultsYear = year == "All" ? "Actual" : year.substring(2);

      const teamStatsRowData = {
        title: teamLink,
        //(for diag only)
        mpg: totalMins < 0.99 ? { value: totalMins - 1.0 } : undefined,
        nil: (
          <small>
            <i>{totalNil.toFixed(0)}</i>
          </small>
        ),

        // Eval mode
        actual_mpg:
          totalActualMins && !actualBenchInfo && totalActualMins < 0.99
            ? { value: (totalActualMins - 1.0) * 40 * 5 }
            : undefined,
        actual_net: totalActualMins ? dummyTeamActual?.off_net : undefined,
        actual_off: totalActualMins ? dummyTeamActual?.off_adj_ppp : undefined,
        actual_def: totalActualMins ? dummyTeamActual?.def_adj_ppp : undefined,

        // Off-season balanced; In-season: actual results
        ok_net: !_.isNil(rawNetSum)
          ? rawTotalMins
            ? { value: rawNetSum }
            : undefined
          : { value: okTotals.net },
        ok_off: !_.isNil(rawOffSum)
          ? rawTotalMins
            ? { value: rawOffSum + avgEff }
            : undefined
          : { value: okTotals.off + avgEff },
        ok_def: !_.isNil(rawDefSum)
          ? rawTotalMins
            ? { value: rawDefSum + avgEff }
            : undefined
          : { value: okTotals.def + avgEff },
        // Off-season optimistic; In-season adjusted
        good_net: dummyTeamGood.off_net,
        good_off: dummyTeamGood.off_adj_ppp,
        good_def: dummyTeamGood.def_adj_ppp,
        bad_net: offSeasonMode ? dummyTeamBad.off_net : undefined,
        bad_off: offSeasonMode ? dummyTeamBad.off_adj_ppp : undefined,
        bad_def: offSeasonMode ? dummyTeamBad.def_adj_ppp : undefined,
      };
      const teamProjectedGradesRowData =
        filteredPlayerSet && preSeasonDivisionStats
          ? {
              title: <b>Team Grades (preseason)</b>,
              actual_net: evalMode ? teamGradesActualVsProj.off_net : undefined,
              actual_off: evalMode
                ? teamGradesActualVsProj.off_adj_ppp
                : undefined,
              actual_def: evalMode
                ? teamGradesActualVsProj.def_adj_ppp
                : undefined,
              ok_net: teamGradesOkNextYear.off_net,
              ok_off: teamGradesOkNextYear.off_adj_ppp,
              ok_def: teamGradesOkNextYear.def_adj_ppp,
              good_net: teamGradesGoodNextYear.off_net,
              good_off: teamGradesGoodNextYear.off_adj_ppp,
              good_def: teamGradesGoodNextYear.def_adj_ppp,
              bad_net: teamGradesBadNextYear.off_net,
              bad_off: teamGradesBadNextYear.off_adj_ppp,
              bad_def: teamGradesBadNextYear.def_adj_ppp,
            }
          : undefined;

      const teamGradesRowData =
        !teamProjectedGradesRowData || !usePreseasonRanksOnly
          ? {
              title: (
                <b>
                  Team Grades{" "}
                  {divisionStatsCache.year && divisionStatsCache.year != "None"
                    ? (() => {
                        const prevYear = DateUtils.getPrevYear(year);
                        if (usePreseasonRanksOnly) {
                          return "(preseason)";
                        } else {
                          return divisionStatsCache.year !=
                            (!offSeasonMode || evalMode ? year : prevYear)
                            ? `(gen. [${divisionStatsCache.year.substring(2)}])`
                            : `(${divisionStatsCache.year.substring(2)})`;
                        }
                      })()
                    : null}
                </b>
              ),
              actual_net: teamGradesActual.off_net,
              actual_off: teamGradesActual.off_adj_ppp,
              actual_def: teamGradesActual.def_adj_ppp,
              ok_net:
                offSeasonMode || rawTotalMins > 0
                  ? teamGradesOk.off_net
                  : undefined,
              ok_off:
                offSeasonMode || rawTotalMins > 0
                  ? teamGradesOk.off_adj_ppp
                  : undefined,
              ok_def:
                offSeasonMode || rawTotalMins > 0
                  ? teamGradesOk.def_adj_ppp
                  : undefined,
              good_net: teamGradesGood.off_net,
              good_off: teamGradesGood.off_adj_ppp,
              good_def: teamGradesGood.def_adj_ppp,
              bad_net: offSeasonMode ? teamGradesBad.off_net : undefined,
              bad_off: offSeasonMode ? teamGradesBad.off_adj_ppp : undefined,
              bad_def: offSeasonMode ? teamGradesBad.def_adj_ppp : undefined,
            }
          : teamProjectedGradesRowData;

      const showSeparateProjectedGrades =
        teamProjectedGradesRowData &&
        teamProjectedGradesRowData != teamGradesRowData;

      if (!_.isNil(diffBasis) && _.isEmpty(diffBasis)) {
        setDiffBasis({
          data: _.omit(
            teamStatsRowData,
            [
              "title",
              "nil",
              "actual_mpg",
              "actual_net",
              "actual_off",
              "actual_def",
            ].concat(offSeasonMode ? [] : ["ok_net", "ok_off", "ok_def"])
          ) as PureStatSet,
          grades: _.omit(
            teamGradesRowData,
            ["title", "actual_net", "actual_off", "actual_def"].concat(
              offSeasonMode ? [] : ["ok_net", "ok_off", "ok_def"]
            )
          ) as PureStatSet,
          projectedGrades: teamProjectedGradesRowData
            ? (_.omit(
                teamProjectedGradesRowData,
                ["title"].concat(
                  offSeasonMode ? [] : ["ok_net", "ok_off", "ok_def"] //(don't think this is actually needed)
                )
              ) as PureStatSet)
            : undefined,
        });
      }

      //TODO; centralize this conf logic (also used in OffseasonLeaderboardTable)
      const offseasonConfChanges = latestConfChanges[year] || {};
      const confLookupToUse =
        efficiencyInfo[`${gender}_${yearWithStats}`] ||
        efficiencyInfo[`${gender}_Latest`];
      const confStr =
        offseasonConfChanges[team] || confLookupToUse?.[0]?.[team]?.conf || "";
      const confStrToUse =
        confStr.length > 35
          ? ConferenceToNickname[confStr] || confStr
          : confStr;
      //(in practice this will always be the confStr, but if we ever narrow down the 1st column this pattern may be useful)

      // Build a link to the offseason leaderboard:

      const confEl = (() => {
        const overrides = _.chain(buildStateForTeamLeaderboard())
          .mapKeys((val, k) => (val ? `${team}__${k}` : `ignore__${k}`))
          .value();
        if (year > DateUtils.offseasonYear) {
          const confTooltip = (
            <Tooltip id={`confTooltip`}>
              <span>
                View this team (with any overrides) in a conference ranking for
                the following season
              </span>
            </Tooltip>
          );
          const url = UrlRouting.getOffseasonLeaderboard({
            year: year,
            confs: ConferenceToNickname[confStr],
            teamView: team,
            ...overrides,
          });
          return (
            <OverlayTrigger placement="auto" overlay={confTooltip}>
              <a href={url}>{confStrToUse}</a>
            </OverlayTrigger>
          );
        } else if (year == DateUtils.offseasonYear) {
          //TODO: currently only support review mode 1 year back, add more years
          const confTooltip = (
            <Tooltip id={`confReviewTooltip`}>
              <span>
                View the evaluation of this team's season (with any overrides)
                vs its ranking, together with other teams in teh conference
              </span>
            </Tooltip>
          );
          const url = UrlRouting.getOffseasonLeaderboard({
            year: DateUtils.getPrevYear(year), //TODO: currently the team leaderboard interprets year differently in "review" mode, fix this once have fixed that
            confs: ConferenceToNickname[confStr],
            evalMode: true,
            teamView: team,
            ...overrides,
          } as OffseasonLeaderboardParams);
          return (
            <OverlayTrigger placement="auto" overlay={confTooltip}>
              <a href={url}>{confStrToUse}</a>
            </OverlayTrigger>
          );
        } else {
          //(don't yet support a link)
          return <i>{confStrToUse}</i>;
        }
      })();

      const subHeaderOffset = _.flow([
        (offset: number) => {
          if (enableNil) {
            return offset + 1; //(adding NIL column)
          } else return offset;
        },
        (offset: number) => {
          if (caliberMode && evalMode) {
            return offset + 2; //(in eval mode don't have ORtg/usage/reb but do have 2 caliber cols)
          } else if (caliberMode) {
            return offset - 2; //(otherwise removing ORtg/usage/reb adding caliber)
          } else return offset;
        },
      ]);

      const caliberGradient = (from: number, to: number) => {
        const fromColor = CbbColors.p_rapmCaliber(from);
        const midColor = CbbColors.p_rapmCaliber(0.5 * (from + to));
        const endColor = CbbColors.p_rapmCaliber(to);
        return `linear-gradient(to right, ${fromColor}, ${midColor} 25%, ${midColor} 75%, ${endColor})`;
      };

      const subHeaders = (
        caliberMode
          ? [
              GenericTableOps.buildTextRow(
                <Container>
                  <Row>
                    <Col
                      className="text-center"
                      style={{
                        background: caliberGradient(-1, 0),
                        color: "white",
                      }}
                    >
                      Bench-
                    </Col>
                    <Col
                      className="text-center"
                      style={{
                        background: caliberGradient(0, 1),
                        color: "white",
                      }}
                    >
                      Bench
                    </Col>
                    <Col
                      className="text-center"
                      style={{ background: caliberGradient(1, 2) }}
                    >
                      Rotation-
                    </Col>
                    <Col
                      className="text-center"
                      style={{ background: caliberGradient(2, 3) }}
                    >
                      Rotation
                    </Col>
                    <Col
                      className="text-center"
                      style={{ background: caliberGradient(3, 4) }}
                    >
                      Starter-
                    </Col>
                    <Col
                      className="text-center"
                      style={{ background: caliberGradient(4, 5) }}
                    >
                      Starter
                    </Col>
                    <Col
                      className="text-center"
                      style={{ background: caliberGradient(5, 6) }}
                    >
                      Starter+
                    </Col>
                    <Col
                      className="text-center"
                      style={{
                        background: caliberGradient(6, 7),
                        color: "white",
                      }}
                    >
                      All Conf
                    </Col>
                    <Col
                      className="text-center"
                      style={{
                        background: caliberGradient(7, 8),
                        color: "white",
                      }}
                    >
                      All Amer.
                    </Col>
                  </Row>
                </Container>,
                "small"
              ),
            ]
          : []
      )
        .concat([
          GenericTableOps.buildSubHeaderRow(
            evalMode
              ? [
                  [<div className="text-right">{confEl}</div>, 1],
                  [<div />, subHeaderOffset(5)],
                  [
                    <i>
                      <b>{`${actualResultsYear} results`}</b>
                    </i>,
                    4,
                  ],
                  [<div />, 1],
                  [
                    <i>
                      <b>Balanced</b>
                    </i>,
                    4,
                  ],
                  [<div />, 1],
                  [<i>Optimistic</i>, 4],
                  [<div />, 1],
                  [<i>Pessimistic</i>, 4],
                  [<div />, 1],
                  [<div />, 2],
                ]
              : !offSeasonMode
              ? [
                  [<div className="text-right">{confEl}</div>, 1],
                  [<div />, subHeaderOffset(9)],
                  [
                    <i>
                      <b>{actualResultsYear} results</b>
                    </i>,
                    4,
                  ],
                  [<div />, 1],
                  [<i>Adjusted results</i>, 4],
                  [<div />, 1],
                  [<div />, 2],
                ]
              : [
                  [<div className="text-right">{confEl}</div>, 1],
                  [<div />, subHeaderOffset(8)],
                  [
                    <i>
                      <b>Balanced</b>
                    </i>,
                    4,
                  ],
                  [<div />, 1],
                  [<i>Optimistic</i>, 4],
                  [<div />, 1],
                  [<i>Pessimistic</i>, 4],
                  [<div />, 1],
                  [<div />, 2],
                ],
            "small text-center"
          ),
        ])
        .concat(
          _.isEmpty(filteredPlayerSet)
            ? []
            : [
                GenericTableOps.buildDataRow(
                  teamStatsRowData,
                  GenericTableOps.defaultFormatter,
                  GenericTableOps.defaultCellMeta,
                  TeamEditorTableUtils.teamTableDef
                ),
                GenericTableOps.buildDataRow(
                  teamGradesRowData,
                  GenericTableOps.defaultFormatter,
                  GenericTableOps.defaultCellMeta,
                  TeamEditorTableUtils.gradeTableDef
                ),
              ]
        )
        .concat(
          showSeparateProjectedGrades
            ? [
                GenericTableOps.buildDataRow(
                  teamProjectedGradesRowData,
                  GenericTableOps.defaultFormatter,
                  GenericTableOps.defaultCellMeta,
                  TeamEditorTableUtils.gradeTableDef
                ),
              ]
            : []
        )
        .concat(
          diffBasis?.data
            ? [
                GenericTableOps.buildRowSeparator(),
                GenericTableOps.buildDataRow(
                  {
                    ...diffBasis.data,
                    title: "'Pinned' Team Totals",
                  },
                  GenericTableOps.defaultFormatter,
                  GenericTableOps.defaultCellMeta,
                  TeamEditorTableUtils.teamTableDef
                ),
              ]
            : []
        )
        .concat(
          diffBasis?.grades
            ? [
                GenericTableOps.buildDataRow(
                  {
                    ...diffBasis.grades,
                    title: "'Pinned' Team Grades",
                  },
                  GenericTableOps.defaultFormatter,
                  GenericTableOps.defaultCellMeta,
                  TeamEditorTableUtils.gradeTableDef
                ),
              ]
            : []
        )
        .concat(
          diffBasis?.projectedGrades && showSeparateProjectedGrades
            ? [
                GenericTableOps.buildDataRow(
                  {
                    ...diffBasis.projectedGrades,
                    title: "'Pinned' Team Grades (projected)",
                  },
                  GenericTableOps.defaultFormatter,
                  GenericTableOps.defaultCellMeta,
                  TeamEditorTableUtils.gradeTableDef
                ),
              ]
            : []
        );
      return subHeaders;
    };

    ///////////////////////////////////////////////

    // Display pipeline:

    const {
      //(some shortcuts for common vars)
      rosterGuards,
      rosterGuardMins,
      maybeBenchGuard,
      rosterWings,
      rosterWingMins,
      maybeBenchWing,
      rosterBigs,
      rosterBigMins,
      maybeBenchBig,
    } = pxResults;

    //TODO: ugliness: this mutates the bench info while generating the team view, better would be to
    // calculate the depds for buildTeamRows and buildPosHeaderRow here and pass down
    const teamRows = buildTeamRows(
      pxResults.actualResultsForReview,
      pxResults.inSeasonPlayerResultsList,
      [maybeBenchGuard, maybeBenchWing, maybeBenchBig].filter(
        (p) => !_.isNil(p)
      ) as GoodBadOkTriple[],
      pxResults.avgEff
    );

    const maybeSorted = (triples: GoodBadOkTriple[]) =>
      caliberMode
        ? _.sortBy(triples, (triple) => -TeamEditorUtils.getNet(triple.ok, 1.0))
        : triples;

    const rosterTableDataGuards = [buildPosHeaderRow("Guards", rosterGuardMins)]
      .concat(
        _.flatMap(maybeSorted(rosterGuards), (triple) => {
          return buildDataRowFromTriple(triple);
        })
      )
      .concat(
        maybeBenchGuard || showGrades
          ? buildBenchDataRowFromTriple("Guards", maybeBenchGuard)
          : []
      );
    const rosterTableDataWings = [buildPosHeaderRow("Wings", rosterWingMins)]
      .concat(
        _.flatMap(maybeSorted(rosterWings), (triple) => {
          return buildDataRowFromTriple(triple);
        })
      )
      .concat(
        maybeBenchWing || showGrades
          ? buildBenchDataRowFromTriple("Wings", maybeBenchWing)
          : []
      );
    const rosterTableDataBigs = [buildPosHeaderRow("Bigs", rosterBigMins)]
      .concat(
        _.flatMap(maybeSorted(rosterBigs), (triple) => {
          return buildDataRowFromTriple(triple);
        })
      )
      .concat(
        maybeBenchBig || showGrades
          ? buildBenchDataRowFromTriple("Bigs", maybeBenchBig)
          : []
      );

    const addedTxfersStr = _.values(otherPlayerCache)
      .map((p) => p.orig.key)
      .join(" / ");
    const maxRemovedPlayersIndex = _.size(pxResults.allDeletedPlayers) - 1;
    const removedPlayerStr = (
      <span>
        {_.chain(pxResults.allDeletedPlayers)
          .toPairs()
          .flatMap((kv, ii) => {
            const tooltip = (
              <Tooltip id={"returnPlayer" + ii}>
                Return player to roster
              </Tooltip>
            );
            return (
              [
                <OverlayTrigger placement="auto" overlay={tooltip}>
                  <a
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      const newDeletedPlayers = _.clone(deletedPlayers);
                      delete newDeletedPlayers[kv[0]];
                      friendlyChange(() => {
                        setDeletedPlayers(newDeletedPlayers);
                      }, true);
                    }}
                  >
                    {kv[1]}
                  </a>
                </OverlayTrigger>,
              ] as React.ReactNode[]
            ).concat(ii < maxRemovedPlayersIndex ? [" / "] : []);
          })
          .value()}
      </span>
    );

    const rosterTableData = _.flatten([
      rosterTableDataGuards,
      rosterTableDataWings,
      rosterTableDataBigs,
      [GenericTableOps.buildRowSeparator()],
      [
        GenericTableOps.buildTextRow(
          <i>
            Hypotheticals: <b>added</b> [{addedTxfersStr}], <b>removed</b> [
            {removedPlayerStr}]
          </i>,
          "small"
        ),
      ],
    ]);

    return (
      <GenericTable
        tableCopyId="rosterEditorTable"
        tableFields={TeamEditorTableUtils.tableDef(
          evalMode,
          offSeasonMode,
          factorMins,
          caliberMode,
          enableNil
        )}
        tableData={teamRows.concat(rosterTableData)}
        cellTooltipMode={undefined}
      />
    );
  }, [
    dataEvent,
    year,
    team,
    otherPlayerCache,
    deletedPlayers,
    disabledPlayers,
    uiOverrides,
    divisionStatsCache,
    preSeasonDivisionStats,
    playerDivisionStatsCache,
    positionalStatsCache,
    debugMode,
    showPrevSeasons,
    factorMins,
    allEditOpen,
    editOpen,
    evalMode,
    offSeasonMode,
    superSeniorsBack,
    alwaysShowBench,
    diffBasis,
    enableNil,
    showGrades,
  ]);

  /////////////////////////////////////

  // Add players: show the player leaderboard

  const playerLeaderboard = React.useMemo(() => {
    setLboardParams(startingState);
    return (
      <PlayerLeaderboardTable
        startingState={{
          ...startingState,
          transferMode: !nextYearBeforePortalIsActive
            ? yearWithStats == DateUtils.offseasonYear
              ? onlyTransfers
                ? "true:predictions"
                : ":predictions"
              : `${DateUtils.getOffseasonOfYear(yearWithStats)}:predictions`
            : ":predictions",
          //(for the current off-season, only show available transfers; for historical seasons, show all transfers)
          year: onlyThisYear ? yearWithStats : "All",
          tier: "All",
        }}
        dataEvent={
          reloadData
            ? {}
            : lboardAltDataSource
            ? lboardAltDataSource
            : {
                ...dataEvent,
                syntheticData: true,
                players:
                  onlyThisYear && year != "All"
                    ? (dataEvent.players || []).filter(
                        (p) => p.year == yearWithStats
                      )
                    : evalMode
                    ? (dataEvent.players || []).filter(
                        (p) => (p.year || "") <= yearWithStats
                      )
                    : dataEvent.players,
                transfers:
                  hasTransfers && year != "All"
                    ? dataEvent.transfers?.[0]
                    : undefined,
              }
        }
        onChangeState={(newParams: PlayerLeaderboardParams) => {
          const dataSubEventKey = newParams.t100
            ? "t100"
            : newParams.confOnly
            ? "conf"
            : "all";

          if (dataSubEventKey != "all") {
            const prevYearWithStats = DateUtils.getPrevYear(yearWithStats);

            //TODO: not supporting this correctly right now because not guaranteed to have players in memory
            //so might not be able to reconstruct from the keys - hence this logic cannot currently be reached via UI
            const fetchAll = LeaderboardUtils.getMultiYearPlayerLboards(
              dataSubEventKey,
              gender,
              yearWithStats,
              "All",
              [DateUtils.getOffseasonOfYear(yearWithStats) || ""],
              [prevYearWithStats]
            );

            fetchAll.then((jsonsIn: any[]) => {
              const jsons = _.dropRight(jsonsIn, 1);
              setLboardAltDataSource({
                players: _.chain(jsons)
                  .map(
                    (d) =>
                      (d.players || []).map((p: any) => {
                        p.tier = d.tier;
                        return p;
                      }) || []
                  )
                  .flatten()
                  .value(),
                confs: _.chain(jsons)
                  .map((d) => d.confs || [])
                  .flatten()
                  .uniq()
                  .value(),
                transfers: _.last(jsonsIn) as Record<
                  string,
                  Array<TransferModel>
                >,
              });
            });
          } else {
            setLboardAltDataSource(undefined); //(use default)
          }
          setLboardParams(newParams);
        }}
        teamEditorMode={(p: IndivStatSet) => {
          const newOtherPlayerCache = _.clone(otherPlayerCache);

          TeamEditorUtils.getBasePlayers(
            team,
            year,
            (dataEvent.players || []).filter(
              (maybeP) =>
                maybeP.code == p.code && (maybeP.year || "") <= yearWithStats
            ),
            offSeasonMode,
            true,
            undefined,
            {},
            // Build a transfer set explicitly for this player
            [
              { [p.code || ""]: [{ f: p.team || "", t: team }] },
              dataEvent.transfers?.[1] || {},
            ],
            p.year || yearWithStats
          ).list.forEach((triple) => {
            newOtherPlayerCache[triple.key] = triple;
          });

          friendlyChange(() => {
            setOtherPlayerCache(newOtherPlayerCache);
          }, true);
        }}
      />
    );
  }, [
    dataEvent,
    reloadData,
    team,
    year,
    otherPlayerCache,
    onlyTransfers,
    onlyThisYear,
    setLboardAltDataSource,
  ]);

  /////////////////////////////////////

  // 4] View

  /** Copy to clipboard button */
  const getCopyLinkButton = () => {
    const tooltip = (
      <Tooltip id="copyLinkTooltip">Copies URL to clipboard</Tooltip>
    );
    return (
      <OverlayTrigger placement="auto" overlay={tooltip}>
        <Button
          className="float-left"
          id={`copyLink_playerLeaderboard`}
          variant="outline-secondary"
          size="sm"
        >
          <FontAwesomeIcon icon={faLink} />
        </Button>
      </OverlayTrigger>
    );
  };
  /** This grovelling is needed to ensure that clipboard is only loaded client side */
  function initClipboard() {
    if (null == clipboard) {
      var newClipboard = new ClipboardJS(`#copyLink_playerLeaderboard`, {
        text: function (trigger) {
          return window.location.href;
        },
      });
      newClipboard.on("success", (event: ClipboardJS.Event) => {
        //(unlike other tables, don't add to history)
        // Clear the selection in some visually pleasing way
        setTimeout(function () {
          event.clearSelection();
        }, 150);
      });
      setClipboard(newClipboard);
    }
  }

  /** At the expense of some time makes it easier to see when changes are happening */
  const friendlyChange = (
    change: () => void,
    guard: boolean,
    timeout: number = 250
  ) => {
    if (guard) {
      setLoadingOverride(true);
      setTimeout(() => {
        change();
      }, timeout);
    }
  };

  const confsWithTeams = dataEvent?.confMap
    ? _.toPairs(dataEvent?.confMap || {}).map((kv) => {
        const teams = kv[1] || [];
        return _.isEmpty(teams) ? kv[0] : `${kv[0]} [${teams.join(", ")}]`;
      })
    : dataEvent?.confs || [];

  /** Let the user know that he might need to change */
  const MenuList = (props: any) => {
    return (
      <components.MenuList {...props}>
        <p className="text-secondary text-center">
          (Let me know if there's a team/season you want to see!)
        </p>
        {props.children}
      </components.MenuList>
    );
  };
  /** Adds the MenuList component with user prompt if there are teams fitered out*/
  function maybeMenuList() {
    if (gender == "Women" || year < DateUtils.yearFromWhichAllMenD1Imported) {
      return { MenuList };
    }
  }
  /** For use in team select */
  function getCurrentTeamOrPlaceholder() {
    const currTeam = AvailableTeams.calculateCurrentLabel(
      team,
      yearWithStats,
      gender,
      (aliasUpdate) => {
        setTeam(aliasUpdate);
      }
    ) || {
      value: undefined,
      label: "Choose Team...",
    };
    return currTeam;
  }

  /** Handles switching between off-season and what-if mode */
  function setOffSeasonModeWithEffects(newOffSeasonMode: boolean) {
    if (newOffSeasonMode) {
      setOffSeasonMode(true);
    } else {
      setOffSeasonMode(false);
    }
    setDiffBasis(undefined); //(turn off diff basis since data format is changing)
  }

  return (
    <Container>
      {overrideGrades ? null : (
        <Form.Group as={Row}>
          <Col xs={6} sm={6} md={3} lg={2}>
            <ThemedSelect
              value={stringToOption(gender)}
              options={["Men", "Women"].map((gender) => stringToOption(gender))}
              isSearchable={false}
              onChange={(option: any) => {
                if ((option as any)?.value) {
                  const newGender = (option as any).value;
                  friendlyChange(() => {
                    setGender(newGender);
                    setOtherPlayerCache({});
                    setDisabledPlayers({});
                    setDeletedPlayers({});
                    setEditOpen({});
                    setUiOverrides({});
                    setLboardAltDataSource(undefined);
                  }, newGender != gender);
                }
              }}
            />
          </Col>
          <Col xs={6} sm={6} md={3} lg={2}>
            <ThemedSelect
              value={stringToOption(year)}
              options={DateUtils.teamEditorYears(offSeasonMode)
                .concat(offSeasonMode ? [] : ["All"])
                .map((r) => stringToOption(r))}
              isSearchable={false}
              onChange={(option: any) => {
                if ((option as any)?.value) {
                  const newYear = (option as any).value;
                  friendlyChange(() => {
                    setYear(newYear);
                    if (newYear == "All") {
                      setOffSeasonMode(false);
                      setEvalMode(false);
                    } else if (newYear > DateUtils.offseasonYear) {
                      setEvalMode(false);
                      setOffSeasonMode(true);
                    }
                    setOtherPlayerCache({});
                    setDisabledPlayers({});
                    setDeletedPlayers({});
                    setEditOpen({});
                    setUiOverrides({});
                    setLboardAltDataSource(undefined);
                  }, newYear != year);
                }
              }}
            />
          </Col>
          <Col className="w-100" bsPrefix="d-lg-none d-md-none" />
          <Col xs={12} sm={12} md={6} lg={6}>
            <ThemedSelect
              isDisabled={false}
              components={maybeMenuList()}
              isClearable={false}
              styles={{ menu: (base: any) => ({ ...base, zIndex: 1000 }) }}
              value={getCurrentTeamOrPlaceholder()}
              options={AvailableTeams.teamsToLabels(teamList)}
              onChange={(option: any) => {
                const selection = (option as any)?.value || "";
                friendlyChange(() => {
                  setTeam(selection);
                  setOtherPlayerCache({});
                  setDisabledPlayers({});
                  setDeletedPlayers({});
                  setEditOpen({});
                  setUiOverrides({});
                }, team != selection);
              }}
            />
          </Col>
          <Col lg={1} className="mt-1">
            {getCopyLinkButton()}
          </Col>
          <Form.Group as={Col} sm="1">
            <GenericTogglingMenu>
              <GenericTogglingMenuItem
                text={"Show projection ranks/%iles"}
                truthVal={showGrades != ""}
                onSelect={() =>
                  friendlyChange(() => {
                    if (showGrades == "" && showPrevSeasons) {
                      // (can't show grades and history at the same time, UI reasons)
                      setShowPrevSeasons(false);
                    }
                    setShowGrades(
                      showGrades ? "" : ParamDefaults.defaultEnabledGrade
                    );
                  }, true)
                }
              />
              <GenericTogglingMenuItem
                text={"Show players' previous seasons"}
                truthVal={showPrevSeasons}
                onSelect={() =>
                  friendlyChange(() => {
                    if (!showPrevSeasons && showGrades) {
                      // (can't show grades and history at the same time, UI reasons)
                      setShowGrades("");
                    }
                    setShowPrevSeasons(!showPrevSeasons);
                  }, true)
                }
              />
              <GenericTogglingMenuItem
                text={<span>Factor minutes % into player contributions</span>}
                truthVal={factorMins}
                onSelect={() =>
                  friendlyChange(() => setFactorMins(!factorMins), true)
                }
              />
              <GenericTogglingMenuItem
                text={"Always show bench minutes"}
                truthVal={alwaysShowBench}
                onSelect={() =>
                  friendlyChange(
                    () => setAlwaysShowBench(!alwaysShowBench),
                    true
                  )
                }
              />
              <Dropdown.Divider />
              <GenericTogglingMenuItem
                text={"Super-senior season used"}
                truthVal={superSeniorsBack}
                onSelect={() =>
                  friendlyChange(
                    () => setSuperSeniorsBack(!superSeniorsBack),
                    true
                  )
                }
              />
              <GenericTogglingMenuItem
                text={"'What If?' mode"}
                truthVal={!offSeasonMode}
                disabled={year > DateUtils.offseasonYear}
                onSelect={() =>
                  friendlyChange(() => {
                    setOffSeasonModeWithEffects(!offSeasonMode);
                    setEvalMode(false);
                  }, true)
                }
              />
              <GenericTogglingMenuItem
                text={
                  <span>
                    NIL mode enabled <Badge variant="dark">fictional!</Badge>
                  </span>
                }
                truthVal={enableNil}
                onSelect={() =>
                  friendlyChange(() => {
                    setEnableNil(!enableNil);
                  }, true)
                }
              />
              <Dropdown.Divider />
              <GenericTogglingMenuItem
                text={"Review mode"}
                truthVal={evalMode}
                disabled={year > DateUtils.offseasonYear}
                onSelect={() =>
                  friendlyChange(() => {
                    setOffSeasonModeWithEffects(true);
                    setEvalMode(!evalMode);
                  }, true)
                }
              />
              <GenericTogglingMenuItem
                text={"Debug/Diagnostic mode"}
                truthVal={debugMode}
                onSelect={() =>
                  friendlyChange(() => setDebugMode(!debugMode), true)
                }
              />
            </GenericTogglingMenu>
          </Form.Group>
        </Form.Group>
      )}
      <Row>
        <Col xs={8} sm={10} md={10} lg={8}>
          <ToggleButtonGroup
            items={[
              {
                label: "Diff",
                tooltip:
                  "When enabled - saves the team grades from the current roster config, and shows that along with the new grades coming from any subsequent edits",
                toggled: diffBasis != undefined,
                disabled: false,
                onClick: () =>
                  friendlyChange(() => {
                    setDiffBasis(_.isNil(diffBasis) ? {} : undefined);
                    //(empty means active and will be filled in when the page rerenders)
                  }, true),
              },
              {
                label: "Grades",
                tooltip:
                  "If enabled show the ranks/%iles corresponding to the players' projections",
                toggled: showGrades != "",
                onClick: () =>
                  friendlyChange(() => {
                    if (showGrades == "" && showPrevSeasons) {
                      // (can't show grades and history at the same time, UI reasons)
                      setShowPrevSeasons(false);
                    }
                    setShowGrades(
                      showGrades ? "" : ParamDefaults.defaultEnabledGrade
                    );
                  }, true),
              },
              {
                label: "History",
                tooltip:
                  "If enabled show player's previous 2 seasons (useful sanity check for projections)",
                toggled: showPrevSeasons,
                onClick: () =>
                  friendlyChange(() => {
                    if (!showPrevSeasons && showGrades) {
                      // (can't show grades and history at the same time, UI reasons)
                      setShowGrades("");
                    }
                    setShowPrevSeasons(!showPrevSeasons);
                  }, true),
              },
              {
                label: "* Mins%",
                tooltip:
                  "Whether to incorporate % of minutes played into adjusted ratings (ie turns it into 'production per team 100 possessions')",
                toggled: factorMins,
                onClick: () =>
                  friendlyChange(() => setFactorMins(!factorMins), true),
              },
              {
                label: "Bench",
                tooltip:
                  "If enabled show bench position groups even if they play no minutes (useful if you want to override the minutes)",
                toggled: alwaysShowBench,
                onClick: () =>
                  friendlyChange(
                    () => setAlwaysShowBench(!alwaysShowBench),
                    true
                  ),
              },
              {
                label: "Super Sr",
                tooltip:
                  "If enabled, assume seniors with eligibility will return (or you can add them from 'Add New Players' (off-season mode only)",
                toggled: superSeniorsBack,
                onClick: () =>
                  friendlyChange(() => {
                    setSuperSeniorsBack(!superSeniorsBack);
                  }, true),
              },
            ].concat(
              overrideGrades
                ? []
                : [
                    {
                      label: "What If?",
                      tooltip:
                        "Describes what actually happened for the selected season, and allows editing to explore different scenarios",
                      toggled: !offSeasonMode,
                      disabled: year > DateUtils.offseasonYear,
                      onClick: () =>
                        friendlyChange(() => {
                          setOffSeasonModeWithEffects(!offSeasonMode);
                          setEvalMode(false);
                        }, true),
                    },
                    {
                      label: "Review",
                      tooltip:
                        "Compares the off-season projection against what actually happened (/is actually happening) the following year",
                      toggled: evalMode,
                      disabled: year > DateUtils.offseasonYear,
                      onClick: () =>
                        friendlyChange(() => {
                          setOffSeasonModeWithEffects(true);
                          setEvalMode(!evalMode);
                        }, true),
                    },
                  ]
            )}
          />
        </Col>
        <Col />
        {overrideGrades ? (
          <Col xs={2}>
            <Button
              size="sm"
              variant="outline-primary"
              onClick={(ev: any) => {
                const teamLeaderboardState = buildStateForTeamLeaderboard();
                onChangeState(teamLeaderboardState);
              }}
            >
              Save
            </Button>
            &nbsp;&nbsp;
            <Button
              size="sm"
              variant="outline-secondary"
              onClick={(ev: any) => {
                setOtherPlayerCache({});
                setDeletedPlayers({});
                setDisabledPlayers({});
                setUiOverrides({});
                setAlwaysShowBench(false);
                onChangeState({});
              }}
            >
              Reset
            </Button>
          </Col>
        ) : null}
      </Row>
      <Row className="mt-2">
        <Col style={{ paddingLeft: "5px", paddingRight: "5px" }}>
          <LoadingOverlay
            active={needToLoadQuery()}
            spinner
            text={"Loading Team Editor..."}
          >
            {rosterTable}
          </LoadingOverlay>
        </Col>
      </Row>
      <Row>
        <Col style={{ paddingLeft: "5px", paddingRight: "5px" }}>
          <GenericCollapsibleCard
            minimizeMargin={true}
            title="Add New Player"
            helpLink={undefined}
            startClosed={false}
          >
            <Container>
              <Row>
                <Form.Group as={Col} xs="4" className="mt-2">
                  <Form.Check
                    type="switch"
                    id="addNewPlayerMode"
                    checked={addNewPlayerMode}
                    onChange={() => {
                      setTimeout(() => {
                        setReloadData(true);
                        setAddNewPlayerMode(!addNewPlayerMode);
                        setTimeout(() => {
                          setReloadData(false);
                        }, 100);
                      }, 250);
                    }}
                    label="Manual Player Builder"
                  />
                </Form.Group>
                <Form.Group as={Col} xs="4" className="mt-2">
                  <Form.Check
                    type="switch"
                    disabled={
                      !hasTransfers ||
                      addNewPlayerMode ||
                      year == "All" ||
                      nextYearBeforePortalIsActive
                    }
                    id="onlyTransfers"
                    checked={
                      onlyTransfers &&
                      hasTransfers &&
                      year != "All" &&
                      !nextYearBeforePortalIsActive
                    }
                    onChange={() => {
                      setTimeout(() => {
                        setReloadData(true);
                        setOnlyTransfers(!onlyTransfers);
                        setTimeout(() => {
                          setReloadData(false);
                        }, 100);
                      }, 250);
                    }}
                    label="Only show transfers"
                  />
                </Form.Group>
                <Form.Group as={Col} xs="4" className="mt-2">
                  <Form.Check
                    type="switch"
                    disabled={year == "All" || addNewPlayerMode}
                    id="onlyThisYear"
                    checked={year != "All" && onlyThisYear}
                    onChange={() => {
                      setTimeout(() => {
                        setReloadData(true);
                        setOnlyThisYear(!onlyThisYear);
                        setTimeout(() => {
                          setReloadData(false);
                        }, 100);
                      }, 250);
                    }}
                    label="Only show this season"
                  />
                </Form.Group>
              </Row>
              {addNewPlayerMode ? (
                <Row className="small mb-4">
                  <Col>
                    <TeamRosterEditor
                      isBench={false}
                      enableNil={enableNil}
                      addNewPlayerMode={true}
                      overrides={undefined}
                      onUpdate={(edit: PlayerEditModel | undefined) => {
                        if (edit) {
                          const currOverrides = _.clone(uiOverrides);
                          currOverrides[edit.name || ""] = edit;
                          setUiOverrides(currOverrides);
                        }
                      }}
                      onDelete={() => {
                        //(can't be called)
                      }}
                    />
                  </Col>
                </Row>
              ) : null}
              {addNewPlayerMode ? null : <Row>{playerLeaderboard}</Row>}
            </Container>
          </GenericCollapsibleCard>
        </Col>
      </Row>
    </Container>
  );
};

export default TeamEditorTable;
