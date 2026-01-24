// React imports:
import React, { useState, useEffect, ReactNode, useRef } from "react";

// Next imports:
import { NextPage } from "next";

// Lodash:
import _ from "lodash";
import {
  IndivCareerInfo,
  IndivCareerStatSet,
  Statistic,
  TeamStatSet,
} from "../utils/StatModels";
import ToggleButtonGroup, {
  ToggleButtonItem,
} from "./shared/ToggleButtonGroup";
import GenericTogglingMenu from "./shared/GenericTogglingMenu";
import {
  getCommonFilterParams,
  ParamDefaults,
  ParamPrefixes,
  PlayerCareerParams,
  SimilarityConfig,
  DefaultSimilarityConfig,
} from "../utils/FilterModels";
import { useTheme } from "next-themes";
import { efficiencyAverages } from "../utils/public-data/efficiencyAverages";
import ShotChartDiagView, { UserChartOpts } from "./diags/ShotChartDiagView";
import { TableDisplayUtils } from "../utils/tables/TableDisplayUtils";
import GenericTable, { GenericTableOps, GenericTableRow } from "./GenericTable";
import { CommonTableDefs } from "../utils/tables/CommonTableDefs";
import { RosterTableUtils } from "../utils/tables/RosterTableUtils";
import {
  Button,
  Col,
  Container,
  Form,
  InputGroup,
  OverlayTrigger,
  Row,
  Tooltip,
} from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMinusSquare,
  faCalendar,
  faCalendarTimes,
} from "@fortawesome/free-regular-svg-icons";
import { faFilter, faThumbtack } from "@fortawesome/free-solid-svg-icons";
import {
  DivisionStatsCache,
  GradeTableUtils,
  PositionStatsCache,
} from "../utils/tables/GradeTableUtils";
import IndivPlayTypeDiagRadar, {
  PlayerStyleOpts,
} from "./diags/IndivPlayTypeDiagRadar";
import { UrlRouting } from "../utils/UrlRouting";
import { PlayTypeUtils } from "../utils/stats/PlayTypeUtils";
import { DateUtils } from "../utils/DateUtils";
import ShotZoneChartDiagView from "./diags/ShotZoneChartDiagView";
import { ShotChartUtils } from "../utils/stats/ShotChartUtils";
import { ConferenceToNickname } from "../utils/public-data/ConferenceInfo";
import { CbbColors } from "../utils/CbbColors";
import { RequestUtils } from "../utils/RequestUtils";
import fetchBuilder from "fetch-retry-ts";
import fetch from "isomorphic-unfetch";
import { dataLastUpdated } from "../utils/internal-data/dataLastUpdated";
import {
  PlayerSimilarityUtils,
  SimilarityDiagnostics,
} from "../utils/stats/PlayerSimilarityUtils";
//@ts-ignore
import LoadingOverlay from "@ronchalant/react-loading-overlay";
import StickyRow from "./shared/StickyRow";
import GenericTogglingMenuItem from "./shared/GenericTogglingMenuItem";
import { AnnotationMenuItems } from "./shared/AnnotationMenuItems";
import { GradeUtils } from "../utils/stats/GradeUtils";
import { FeatureFlags } from "../utils/stats/FeatureFlags";
import SimilarityConfigModal from "./shared/SimilarityConfigModal";
import SimilarityWeights from "./shared/SimilarityWeights";
import SimilarityDiagnosticView from "./diags/SimilarityDiagnosticView";
import PlayerFinderTextBox from "./shared/PlayerFinderTextBox";
import AsyncFormControl from "./shared/AsyncFormControl";
import { PlayTypeDiagUtils } from "../utils/tables/PlayTypeDiagUtils";
import QuickSwitchBar, { quickSwitchDelim } from "./shared/QuickSwitchBar";

//TODO: things to finish off:
// 4] add pinned players to comp list when no similar players
// 5] add a "close and re-run" find button
// 7] (experiment with L3/L4 norms for scoring)

const fetchRetryOptions = {
  retries: 5,
  retryDelay: 500,
  retryOn: [419, 502, 503, 504],
};
const fetchWithRetry = fetchBuilder(fetch, fetchRetryOptions);

type Props = {
  playerSeasons: Array<IndivCareerStatSet>;
  playerCareerParams: PlayerCareerParams;
  onPlayerCareerParamsChange: (p: PlayerCareerParams) => void;
  playerSimilarityMode?: boolean;
};

const PlayerCareerTable: React.FunctionComponent<Props> = ({
  playerSeasons,
  playerCareerParams,
  onPlayerCareerParamsChange,
  playerSimilarityMode,
}) => {
  const isDebug = process.env.NODE_ENV !== "production";

  // 1] Input state

  const server =
    typeof window === `undefined` //(ensures SSR code still compiles)
      ? "server"
      : window.location.hostname;

  const { resolvedTheme } = useTheme();

  /** Only show help for diagnstic on/off on main page */
  const showHelp = !_.startsWith(server, "cbb-on-off-analyzer");

  // 1] State (some of these are phase 2+ and aren't plumbed in yet)

  const commonParams = getCommonFilterParams(playerCareerParams);
  const genderYearLookup = `${commonParams.gender}_${commonParams.year}`;
  const teamSeasonLookup = `${commonParams.gender}_${commonParams.team}_${commonParams.year}`;
  const avgEfficiency =
    efficiencyAverages[genderYearLookup] || efficiencyAverages.fallback;

  const [similarPlayers, setSimilarPlayers] = useState<IndivCareerStatSet[]>(
    []
  );
  const [retrievingPlayers, setRetrievingPlayers] = useState<boolean>(false);
  const [similarityDiagnostics, setSimilarityDiagnostics] = useState<
    SimilarityDiagnostics[]
  >([]);

  // Similarity query cache
  const [vectorCache, setVectorCache] = useState<{
    query: string;
    candidateVectors: any[];
    candidateIds: string[];
    zScores: { means: number[]; stdDevs: number[] };
  } | null>(null);

  // Pinned players state
  const [pinnedPlayers, setPinnedPlayers] = useState<IndivCareerStatSet[]>([]);
  const [pinnedPlayerDiags, setPinnedPlayerDiags] = useState<
    Record<string, SimilarityDiagnostics>
  >({});
  // Unpinned players state
  const [unpinnedPlayerIds, setUnpinnedPlayerIds] = useState<Set<string>>(
    () => {
      const unpinnedIds =
        playerCareerParams.unpinnedIds?.split(",").filter((id) => id.trim()) ||
        [];
      return new Set(unpinnedIds);
    }
  );

  // Filter state
  const [filterStr, setFilterStr] = useState<string>(
    playerCareerParams.filterStr || ParamDefaults.defaultFilterStr
  );
  const [showPinnedOnly, setShowPinnedOnly] = useState<boolean>(
    playerCareerParams.showPinnedOnly || ParamDefaults.defaultShowPinnedOnly
  );
  const [showSimilaritySliders, setShowSimilaritySliders] = useState<boolean>(
    playerCareerParams.showSimilaritySliders ??
      ParamDefaults.defaultShowSimilaritySliders
  );
  const [separatePlayerSeasons, setSeparatePlayerSeasons] = useState<boolean>(
    playerCareerParams.separatePlayerSeasons ??
      ParamDefaults.defaultSeparatePlayerSeasons
  );

  const [comparisonPlayer, setComparisonPlayer] = useState<
    IndivCareerStatSet | undefined
  >(undefined);

  const caseInsensitiveSearch = filterStr == filterStr.toLowerCase();
  const filterFragmentSeparator =
    filterStr.substring(0, 64).indexOf(";") >= 0 ? ";" : ",";
  const filterFragments = filterStr
    .split(filterFragmentSeparator)
    .map((fragment) => _.trim(fragment))
    .filter((fragment) => (fragment ? true : false));
  const filterFragmentsPve = filterFragments.filter(
    (fragment) => fragment[0] != "-"
  );
  const filterFragmentsNve = filterFragments
    .filter((fragment) => fragment[0] == "-")
    .map((fragment) => fragment.substring(1));

  /** Used in table building below but also to display example in tooltip */
  const buildFilterStringTest = (player: IndivCareerStatSet) => {
    const names = (player.key || "").split(" ");
    const firstName = names ? names[names.length - 1] : ""; //(allows eg MiMitchell+Makhi)
    const usefulFormatBuilder = (s: string) => {
      return `${player.roster?.year_class || ""}_${s || ""}:${
        player.team || ""
      }_${player.year || ""}`;
    };
    return (
      `${player.key || ""}:${usefulFormatBuilder(
        `${player.code || ""}+${firstName}`
      )} ${usefulFormatBuilder(player.code || "")}` +
      (player.roster?.ncaa_id
        ? ` ${player.code || ""}_${player.roster?.ncaa_id || ""}`
        : "")
    );
  };

  // Filter function for players
  const filterPlayer = (player: IndivCareerStatSet) => {
    if (!filterStr.trim()) return true;

    const strToTestCase = buildFilterStringTest(player);
    const strToTest = caseInsensitiveSearch
      ? strToTestCase.toLowerCase()
      : strToTestCase;

    const isMatch =
      //(transferred and either doesn't have a destination, or we don't care)
      (filterFragmentsPve.length == 0 ||
        (_.find(
          filterFragmentsPve,
          (fragment) => strToTest.indexOf(fragment) >= 0
        )
          ? true
          : false)) &&
      (filterFragmentsNve.length == 0 ||
        (_.find(
          filterFragmentsNve,
          (fragment) => strToTest.indexOf(fragment) >= 0
        )
          ? false
          : true));

    return isMatch;
  };

  // Just needed for help text!
  const similarOrPinnedList = _.chain(
    showPinnedOnly
      ? pinnedPlayers
      : _.isEmpty(similarPlayers)
      ? pinnedPlayers
      : similarPlayers
  );
  const firstSimilarOrPinnedPlayer =
    comparisonPlayer ||
    similarOrPinnedList
      .filter((p) => !unpinnedPlayerIds.has(p._id as string))
      .filter(filterPlayer)
      .head()
      .value() ||
    similarOrPinnedList.head().value();

  // Filter UI components
  const filterTooltip = (
    <Tooltip id="similarity-filter-tooltip">
      Simple text match for each of the ";"-separated list against a line of
      text with the player, team and year in various formats, in a format like{" "}
      <br />
      {firstSimilarOrPinnedPlayer ? (
        <span>{buildFilterStringTest(firstSimilarOrPinnedPlayer)}</span>
      ) : (
        "Honor, Nick Sr_NiHonor+Nick:Clemson_2021/22 Sr_NiHonor:Clemson_2021/22"
      )}
    </Tooltip>
  );

  const filterIconText = (
    <OverlayTrigger placement="auto" overlay={filterTooltip}>
      <div>
        <FontAwesomeIcon icon={faFilter} />
        <sup>*</sup>
      </div>
    </OverlayTrigger>
  );

  const pinnedOnlyTooltip = (
    <Tooltip id="pinned-only-tooltip">
      When enabled, only shows pinned players. Useful for comparing specific
      players without similar player suggestions.
    </Tooltip>
  );

  // Filter UI component
  const filterComponent = (
    <InputGroup size="sm">
      <InputGroup.Prepend>
        <InputGroup.Text>{filterIconText}</InputGroup.Text>
      </InputGroup.Prepend>
      <AsyncFormControl
        startingVal={filterStr}
        onChange={(t: string) => {
          setFilterStr(t);
        }}
        timeout={300}
        placeholder="See 'Filter' icon tooltip for details"
      />
      <InputGroup.Append>
        <OverlayTrigger placement="top" overlay={pinnedOnlyTooltip}>
          <Button
            variant={showPinnedOnly ? "primary" : "outline-primary"}
            size="sm"
            onClick={() => setShowPinnedOnly(!showPinnedOnly)}
          >
            <FontAwesomeIcon icon={faThumbtack} />
          </Button>
        </OverlayTrigger>
      </InputGroup.Append>
    </InputGroup>
  );

  // Similarity controls state
  const [similarityConfig, setSimilarityConfig] = useState<SimilarityConfig>(
    () => {
      // Ensure we always have valid default values
      const baseConfig = { ...DefaultSimilarityConfig };
      if (playerCareerParams.similarityConfig) {
        // Merge with any existing config, but ensure all numeric values are valid
        return {
          ...baseConfig,
          ...playerCareerParams.similarityConfig,
          playStyleWeight:
            playerCareerParams.similarityConfig.playStyleWeight ??
            baseConfig.playStyleWeight,
          scoringEfficiencyWeight:
            playerCareerParams.similarityConfig.scoringEfficiencyWeight ??
            baseConfig.scoringEfficiencyWeight,
          defenseWeight:
            playerCareerParams.similarityConfig.defenseWeight ??
            baseConfig.defenseWeight,
          playerInfoWeight:
            playerCareerParams.similarityConfig.playerInfoWeight ??
            baseConfig.playerInfoWeight,
        };
      }
      return baseConfig;
    }
  );
  const [showSimilaritySettings, setShowSimilaritySettings] =
    useState<boolean>(false);
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);

  /** Show team and individual grades */
  const [showGrades, setShowGrades] = useState(
    _.isNil(playerCareerParams.showGrades)
      ? ParamDefaults.defaultEnabledGrade
      : playerCareerParams.showGrades
  );
  const [hideGlobalGradeSettings, setHideGlobalGradeSettings] =
    useState<boolean>(true);
  const showStandaloneGrades =
    GradeTableUtils.showingStandaloneGrades(showGrades);

  /** Play style config */
  /** Show simplified player play style breakdown */
  const [showPlayerPlayTypes, setShowPlayerPlayTypes] = useState(
    _.isNil(playerCareerParams.showPlayerPlayTypes)
      ? false
      : playerCareerParams.showPlayerPlayTypes
  );
  const [showPlayerPlayTypesAdjPpp, setShowPlayerPlayTypesAdjPpp] =
    useState<boolean>(playerCareerParams.showPlayerPlayTypesAdjPpp ?? true);
  const [showPlayerPlayTypesPlayType, setShowPlayerPlayTypesPlayType] =
    useState<string | undefined>(
      playerCareerParams.showPlayerPlayTypesPlayType ??
        ParamDefaults.defaultPlayerShowPlayTypesPlayType
    );
  //TODO CSV of yearly quickSwitch options

  /** Shot chart config */
  const [showShotCharts, setShowShotCharts] = useState<boolean>(
    _.isNil(playerCareerParams.playerShotCharts)
      ? false
      : playerCareerParams.playerShotCharts
  );
  // Shot charts:
  const [shotChartConfig, setShotChartConfig] = useState<
    UserChartOpts | undefined
  >({
    buildZones: playerCareerParams.playerShotChartsShowZones,
    quickSwitch: playerCareerParams.playerShotChartQuickSwitch,
    useEfg: playerCareerParams.playerShotChartsUseEfg ?? false,
  });

  /** Splits out offensive and defensive metrics into separate rows */
  const [expandedView, setExpandedView] = useState(
    _.isNil(playerCareerParams.showExpanded)
      ? ParamDefaults.defaultPlayerShowExpanded
      : playerCareerParams.showExpanded
  );

  /** Show the number of possessions as a % of total team count */
  const [possAsPct, setPossAsPct] = useState(
    _.isNil(playerCareerParams.possAsPct)
      ? ParamDefaults.defaultPlayerPossAsPct
      : playerCareerParams.possAsPct
  );
  /** Show the number of possessions as a % of total team count */
  const [factorMins, setFactorMins] = useState(
    _.isNil(playerCareerParams.factorMins)
      ? ParamDefaults.defaultPlayerFactorMins
      : playerCareerParams.factorMins
  );

  /** T100 and conf */
  const [showAll, setShowAll] = useState(
    _.isNil(playerCareerParams.d1) ? true : playerCareerParams.d1
  );
  const [showT100, setShowT100] = useState(playerCareerParams.t100 || false);
  const [showConf, setShowConf] = useState(playerCareerParams.conf || false);

  const [yearsToShow, setYearsToShow] = useState(
    new Set<string>(
      (playerCareerParams.yearsToShow || "")
        .split(",")
        .map(_.trim)
        .filter((p) => !_.isEmpty(p))
    )
  );

  /** The NCAA id corresponding to yearsToShow */
  const [currNcaaId, setCurrNcaaId] = useState<string | undefined>(
    playerCareerParams.ncaaId
  );

  /** Whether to show sub-header with extra info */
  const [showInfoSubHeader, setShowInfoSubHeader] = useState(
    playerCareerParams.showInfoSubHeader || false
  );

  /** Whether to show next year data for similar players */
  const [showNextYear, setShowNextYear] = useState(
    playerCareerParams.showNextYear ?? ParamDefaults.defaultShowNextYear
  );

  /** Whether to enable diff mode (focus UI on comparing source player vs comps) */
  const [diffMode, setDiffMode] = useState(
    playerCareerParams.diffMode ?? ParamDefaults.defaultDiffMode
  );

  const [showRepeatingHeader, setShowRepeatingHeader] = useState(
    true as boolean
  ); //(always defaults to on)

  /** Whether to make the quick toggle bar stick (default: on) - TODO: unused currently */
  const [stickyQuickToggle, setStickyQuickToggle] = useState(
    _.isNil(playerCareerParams.stickyQuickToggle)
      ? true
      : playerCareerParams.stickyQuickToggle
  );

  /** Selected player for comparison in diff mode - TODO probably can simplify by removing this and using comparisonPlayer.key? */
  const [diffQuickSwitch, setDiffQuickSwitch] = useState(
    playerCareerParams.diffQuickSwitch ?? ParamDefaults.defaultDiffQuickSwitch
  );

  /** If changing player to show clear selection */
  if (playerSimilarityMode)
    useEffect(() => {
      const anyOverlap =
        _.isEmpty(setYearsToShow) ||
        _.find(playerSeasons, (info) => yearsToShow.has(info.year || ""));
      if (!anyOverlap) {
        setYearsToShow(new Set());
      }

      setSimilarPlayers([]);
      setComparisonPlayer(undefined);
      setDiffQuickSwitch("");
      setSimilarityDiagnostics([]);
      setVectorCache(null); // Clear cache when player/year changes
    }, [yearsToShow, showConf, showT100, playerSeasons]);

  const isInitialRender = useRef(true);

  /** If changing player to show clear selection - unpinned */
  if (playerSimilarityMode)
    useEffect(() => {
      // Only clear unpinned players after the initial render
      if (!isInitialRender.current) {
        setUnpinnedPlayerIds(new Set());
      }

      // Mark that we're past the initial render
      isInitialRender.current = false;
    }, [yearsToShow, showConf, showT100, currNcaaId]);

  // 2] Data Model

  const playerSeasonInfo = _.chain(playerSeasons)
    .transform((acc, v) => {
      const year = v.year;
      if (year) {
        const playerYear = acc[year] || {};
        const playerId: string = (v as any)._id;
        if (_.endsWith(playerId, "_all")) {
          playerYear.season = v;
        } else if (_.endsWith(playerId, "_conf")) {
          playerYear.conf = v;
        } else if (_.endsWith(playerId, "_t100")) {
          playerYear.t100 = v;
        }
        acc[year] = playerYear;
      }
    }, {} as Record<string, IndivCareerInfo>)
    .toPairs()
    .orderBy(([key, __]) => key, "desc")
    .value();

  useEffect(() => {
    const yearsToShowArr = Array.from(yearsToShow);

    onPlayerCareerParamsChange({
      ...playerCareerParams,
      showExpanded: expandedView,
      showGrades,
      showPlayerPlayTypes,
      showPlayerPlayTypesAdjPpp,
      showPlayerPlayTypesPlayType,
      playerShotCharts: showShotCharts,
      playerShotChartsShowZones: shotChartConfig?.buildZones,
      playerShotChartsUseEfg: shotChartConfig?.useEfg,
      playerShotChartQuickSwitch: shotChartConfig?.quickSwitch,
      factorMins,
      possAsPct,
      d1: showAll,
      t100: showT100,
      conf: showConf,
      yearsToShow:
        yearsToShowArr.length == playerSeasonInfo.length
          ? undefined
          : yearsToShowArr.join(","),
      stickyQuickToggle,
      showInfoSubHeader,
      showNextYear,
      diffMode,
      diffQuickSwitch,
      similarityConfig,
      pinnedIds: pinnedPlayers
        .map((p) => p._id as string)
        .filter((id) => Boolean(id))
        .join(","),
      unpinnedIds: Array.from(unpinnedPlayerIds).join(","),
      filterStr,
      showPinnedOnly,
      showSimilaritySliders,
      separatePlayerSeasons,
    });
  }, [
    showGrades,
    showPlayerPlayTypes,
    showPlayerPlayTypesAdjPpp,
    showPlayerPlayTypesPlayType,
    showShotCharts,
    shotChartConfig,
    expandedView,
    possAsPct,
    factorMins,
    showAll,
    showT100,
    showConf,
    yearsToShow,
    stickyQuickToggle,
    showInfoSubHeader,
    showNextYear,
    diffMode,
    diffQuickSwitch,
    similarityConfig,
    pinnedPlayers,
    unpinnedPlayerIds,
    filterStr,
    showPinnedOnly,
    showSimilaritySliders,
    separatePlayerSeasons,
  ]);

  /** NCAA id has changed, clear years to show */
  if (!playerSimilarityMode)
    useEffect(() => {
      if (playerCareerParams.ncaaId != currNcaaId) {
        setYearsToShow(new Set());
        setCurrNcaaId(playerCareerParams.ncaaId);
      }
    }, [playerCareerParams, currNcaaId]);

  // Grades

  // Events that trigger building or rebuilding the division stats cache (for each year which we might need)
  const [divisionStatsCache, setDivisionStatsCache] = useState<
    Record<string, DivisionStatsCache>
  >({});
  const [teamDivisionStatsCache, setTeamDivisionStatsCache] = useState<
    Record<string, DivisionStatsCache>
  >({});
  const [positionalStatsCache, setPositionalStatsCache] = useState<
    Record<string, PositionStatsCache>
  >({});
  /** TODO: this is used to trigger the memoized table, but not sure it works since the caches could be stale
   * since I'm not using a ref? Maybe it's OK because it's in a memo not an effect?
   */
  const [divisionStatsRefresh, setDivisionStatsRefresh] = useState<number>(0);

  useEffect(() => {
    if (showGrades || showPlayerPlayTypes) {
      const gender = playerCareerParams.gender || ParamDefaults.defaultGender;

      const yearsToCheck = _.uniq(
        playerSeasons
          .map((info) => info.year || "")
          .concat(similarPlayers.map((info) => info.year || ""))
      );
      yearsToCheck
        .filter((y) => y != "")
        .forEach((yearToCheck) => {
          const currCacheForThisYear = divisionStatsCache[yearToCheck] || {};
          const currPosCacheForThisYear =
            positionalStatsCache[yearToCheck] || {};
          const currTeamCacheForThisYear =
            teamDivisionStatsCache[yearToCheck] || {};
          const yearOrGenderChanged =
            yearToCheck != currCacheForThisYear.year ||
            gender != currCacheForThisYear.gender;

          if (_.isEmpty(currCacheForThisYear) || yearOrGenderChanged) {
            if (!_.isEmpty(currCacheForThisYear)) {
              setDivisionStatsCache((currCache) => ({
                ...currCache,
                [yearToCheck]: {},
              })); //unset if set
            }
            if (!_.isEmpty(currPosCacheForThisYear)) {
              setPositionalStatsCache((currPosCache) => ({
                ...currPosCache,
                [yearToCheck]: {},
              })); //unset if set
            }
            GradeTableUtils.populatePlayerDivisionStatsCache(
              { year: yearToCheck, gender },
              (newCache) => {
                setDivisionStatsCache((currCache) => ({
                  ...currCache,
                  [yearToCheck]: newCache,
                }));
                setDivisionStatsRefresh((curr) => curr + 1);
              }
            );
          }

          if (showGrades) {
            //(these are no use if we're just predicted transfer performance)
            const maybePosGroup =
              GradeTableUtils.getPlayerGradesPosGroup(showGrades);
            if (maybePosGroup && maybePosGroup != "All") {
              const posGroupStats = currPosCacheForThisYear[maybePosGroup];
              if (yearOrGenderChanged || !posGroupStats) {
                GradeTableUtils.populatePlayerDivisionStatsCache(
                  { year: yearToCheck, gender },
                  (s: DivisionStatsCache) => {
                    setPositionalStatsCache((currPosCache) => ({
                      ...currPosCache,
                      [yearToCheck]: {
                        ...(currPosCache[yearToCheck] || {}),
                        [maybePosGroup]: {
                          comboTier: s.Combo,
                          highTier: s.High,
                          mediumTier: s.Medium,
                          lowTier: s.Low,
                        },
                      },
                    }));
                    setDivisionStatsRefresh((curr) => curr + 1);
                  },
                  undefined,
                  maybePosGroup
                );
              }
            }
          }
        });
    }
  }, [
    playerCareerParams,
    playerSeasons,
    showGrades,
    showPlayerPlayTypes,
    similarPlayers,
  ]);

  // Table building:

  const offPrefixFn = (key: string) => "off_" + key;
  const offCellMetaFn = (key: string, val: any) => "off";
  const defPrefixFn = (key: string) => "def_" + key;
  const defCellMetaFn = (key: string, val: any) => "def";

  /** Compresses number/height/year into 1 double-width column */
  const rosterInfoSpanCalculator = (key: string) =>
    key == "efg" ? 2 : key == "assist" ? 0 : 1;

  /** Teams for selected seasons */
  const selectedYearsChain = _.chain(playerSeasonInfo).filter(
    (info) => _.isEmpty(yearsToShow) || yearsToShow.has(info[0])
  );
  const currPlayerSelected = playerSimilarityMode
    ? selectedYearsChain
        .take(1)
        .map(([__, player]) => {
          if (showConf) return player.conf || player.season;
          else if (showT100) return player.t100 || player.season;
          else return player.season;
        })
        .value()?.[0]
    : undefined;

  /** Fetch pinned players on startup */
  if (playerSimilarityMode)
    useEffect(() => {
      if (
        playerCareerParams.pinnedIds &&
        pinnedPlayers.length === 0 &&
        playerCareerParams.pinnedIds.trim() !== ""
      ) {
        const gender = playerCareerParams.gender || ParamDefaults.defaultGender;
        const idsToFetch = playerCareerParams.pinnedIds
          .split(",")
          .filter((id) => id.trim());

        const currentJsonEpoch =
          dataLastUpdated[`${gender}_${DateUtils.coreYears[0]}`] || -1;

        if (idsToFetch.length > 0) {
          const allPromises = Promise.all(
            RequestUtils.requestHandlingLogic(
              {
                gender,
                ids: idsToFetch.join(","),
              } as any,
              ParamPrefixes.multiPlayerCareer,
              [],
              (url: string, force: boolean) => {
                return fetchWithRetry(url).then(
                  (response: fetch.IsomorphicResponse) => {
                    return response
                      .json()
                      .then((json: any) => [json, response.ok, response]);
                  }
                );
              },
              Number.NaN, //(bypass cache)
              isDebug
            )
          );

          allPromises
            .then((jsons) => {
              const fetchedPlayers = (
                jsons?.[0]?.responses?.[0]?.hits?.hits || []
              )
                .map((p: any) => {
                  const source = p._source || {};
                  source._id = p._id;
                  return source;
                })
                .filter((p: any) => !_.isEmpty(p));

              setPinnedPlayers(fetchedPlayers);
            })
            .catch((error) => {
              console.log(`Failed to fetch pinned players:`, error);
            });
        }
      }
    }, []);

  type DataType = "Conf Stats" | "vs T100";

  const selectedYearsDataTypeChain: [
    string,
    DataType | undefined,
    IndivCareerStatSet
  ][] = selectedYearsChain
    .flatMap(([year, playerCareerInfo]) => {
      return (
        showAll && playerCareerInfo.season
          ? [[year, undefined, playerCareerInfo.season]]
          : []
      )
        .concat(
          showConf && playerCareerInfo.conf
            ? [[year, "Conf Stats", playerCareerInfo.conf]]
            : []
        )
        .concat(
          showT100 && playerCareerInfo.t100
            ? [[year, "vs T100", playerCareerInfo.t100]]
            : []
        ) as [string, DataType | undefined, IndivCareerStatSet][];
    })
    .value();

  // Some layouting information
  const multipleRowsPerYear =
    (showAll && (showT100 || showConf)) || (showT100 && showConf);
  const extraCharts =
    showStandaloneGrades || showPlayerPlayTypes || showShotCharts;
  const showEveryYear = multipleRowsPerYear || extraCharts;

  /** Ugh covid year messes up using player/class as a unique-ish key */
  const multiYearClassPlayers = _.chain(similarPlayers.concat(pinnedPlayers))
    .transform((acc, v) => {
      const _id = v._id as string;
      const title = `${v.key} (${v.roster?.year_class || "??"}`; //(deliberately missing ) see below
      if (acc[title]) {
        acc[title].push(_id);
      } else {
        acc[title] = [_id];
      }
    }, {} as Record<string, string[]>)
    .mapValues((v) => _.uniq(v).length > 1)
    .pickBy((v, key) => v)
    .value();

  /* For comparison players in quick toggles - note tightly coupled to multiYearClassPlayers */
  const playerTitle = (p: IndivCareerStatSet) => {
    const title = `${p.key} (${p.roster?.year_class || "??"}`; //(deliberately missing ) see below
    if (multiYearClassPlayers[title]) {
      return title + `, ${(p.year || "????").substring(2)})`;
    } else {
      return title + ")";
    }
  };

  const playerRowBuilder = (
    player: IndivCareerStatSet,
    playerYear: string,
    topYear: boolean,
    titleOverride?: DataType,
    titleSuffix?: DataType,
    playerDiffMode?: boolean
  ): GenericTableRow[] => {
    // Misc stats

    player.off_drb = player.def_orb; //(just for display, all processing should use def_orb)
    TableDisplayUtils.injectPlayTypeInfo(player, true, true, teamSeasonLookup);

    // Positional Info

    //(they are in format {pg,sg,sf,pf,c} from this index so we can use them for searching)
    const posFreqs = ["pg", "sg", "sf", "pf", "c"].map(
      (pos) => (player.posFreqs as unknown as Record<string, number>)[pos] || 0
    );
    const posBreakdown =
      _.size(posFreqs) >= 5
        ? _.flatMap(["PG", "SG", "SF", "PF", "C"], (pos, index) => {
            const freqOfPos = (posFreqs[index] || 0) * 100;
            return freqOfPos >= 10 ? [`${pos}: ${freqOfPos.toFixed(0)}%`] : [];
          }).join(", ")
        : undefined;
    const withNonBreakingHyphen = (s: string) => {
      return <span style={{ whiteSpace: "nowrap" }}>{s}</span>;
    };
    player.def_usage = (
      <OverlayTrigger
        placement="auto"
        overlay={TableDisplayUtils.buildPositionTooltip(
          player.posClass || "G?",
          "season",
          true,
          posBreakdown
        )}
      >
        <small>
          {withNonBreakingHyphen(player.posClass || "G?")}
          {posBreakdown ? <sup>*</sup> : undefined}
        </small>
      </OverlayTrigger>
    );

    // Add roster metadata (top-line only):

    if (!titleOverride) {
      const height = player.roster?.height;
      const yearClass = player.roster?.year_class;
      const rosterNum = player.roster?.number;
      const rosterInfoText = `${height && height != "-" ? height : ""} ${
        yearClass ? yearClass : ""
      }${rosterNum ? ` / #${rosterNum}` : ""}`;

      if (rosterInfoText.length > 2) {
        player.def_efg = (
          <small>
            <i className="text-secondary">{rosterInfoText}</i>
          </small>
        );
      }
    } else {
      player.def_efg = undefined;
    }

    // Grades

    //TODO: it would be nice to use the direct vals we have
    // (also do we have intra-conf / T100 stats in enriched mode?)

    const divisionStatsCacheByYear: DivisionStatsCache =
      divisionStatsCache[player.year || "??"] || {};

    const adjMarginPer100 =
      ((player.off_adj_rapm as Statistic)?.value || 0) -
      ((player.def_adj_rapm as Statistic)?.value || 0);
    const adjMarginProd =
      ((player.off_adj_rapm_prod as Statistic)?.value || 0) -
      ((player.def_adj_rapm_prod as Statistic)?.value || 0);
    const adjMargin = factorMins ? adjMarginProd : adjMarginPer100;
    player.off_adj_rapm_margin = {
      value: adjMarginPer100,
    };

    player.off_adj_rapm_margin_prod = {
      value: adjMarginProd,
    };
    // Play style

    const fullYear = DateUtils.fullYearFromShortYear(player.year || "") || "";

    const teamParams = (fullYearInUse: string) => ({
      team: player.team,
      gender: playerCareerParams.gender as unknown as string,
      year: fullYearInUse,
      minRank: "0",
      maxRank: showT100 ? "100" : "400",
      queryFilters: showConf ? "Conf" : undefined,
      factorMins: factorMins,
      possAsPct: possAsPct,
      showExpanded: true,
      calcRapm: true,
      showGrades: "rank:Combo",
      showRoster: true,
    });

    // Inject like this so we don't need to recalculate every time
    if (!player.off_style && player.style) {
      (player as any).off_style = PlayTypeUtils.compressIndivPlayType(
        player.style //(quick hack to re-use PlayerLeaderboardTable logic)
      );
    }

    const navigationOverride = (fullYearInUse: string) => (
      <OverlayTrigger
        placement="auto"
        overlay={
          <Tooltip id={`${player.code}styleTeamView`}>
            Open the Team view with the play style chart showing this player's
            actions in a team context
          </Tooltip>
        }
      >
        <a
          target="_blank"
          href={UrlRouting.getGameUrl(
            {
              ...teamParams(fullYearInUse),
              showTeamPlayTypes: true,
              teamPlayTypeConfig: `||${player.code}||all||multi||`,
            },
            {}
          )}
        >
          Team View<sup>*</sup>
        </a>
      </OverlayTrigger>
    );

    const isSimilarPlayer =
      playerSimilarityMode &&
      currPlayerSelected &&
      player._id != currPlayerSelected?._id;

    const isPlayerCompSource =
      playerSimilarityMode &&
      currPlayerSelected &&
      player._id == currPlayerSelected?._id;

    const isCompPlayer = comparisonPlayer && comparisonPlayer._id == player._id;

    const maybeActiveCompIndex = comparisonPlayer
      ? _.findIndex(similarPlayers, (p) => p._id == comparisonPlayer._id)
      : -1;

    const maybeCompDiag =
      (maybeActiveCompIndex >= 0 &&
        similarityDiagnostics[maybeActiveCompIndex]) ||
      (isCompPlayer && pinnedPlayerDiags[player._id as string]) ||
      undefined;

    const similarOrPinnedPlayers = (
      showPinnedOnly
        ? pinnedPlayers
        : _.isEmpty(similarPlayers)
        ? pinnedPlayers
        : similarPlayers
    )
      .filter((p) => !unpinnedPlayerIds.has(p._id as string))
      .filter(filterPlayer);

    const playStyleQuickSwitchOptions = _.thru(isSimilarPlayer, () => {
      if (isSimilarPlayer) {
        // (just allow comparison vs currPlayerSelected)
        return [
          {
            title: `${currPlayerSelected.key}`,
            player: currPlayerSelected,
            rosterStatsByCode: {},
            teamStats: {} as TeamStatSet,
            avgEfficiency:
              efficiencyAverages[
                `${playerCareerParams.gender}_${DateUtils.getLongFormYear(
                  currPlayerSelected.year || ""
                )}`
              ] || efficiencyAverages.fallback,
            showGrades,
            grades: divisionStatsCache[currPlayerSelected.year || "??"],
            showHelp,
            compressedPlayTypeStats: currPlayerSelected.off_style as any,
            navigationLinkOverride: navigationOverride(
              DateUtils.fullYearFromShortYear(currPlayerSelected.year || "") ||
                ""
            ),
          },
        ];
      } else if (playerSimilarityMode) {
        return similarOrPinnedPlayers.map((player) => ({
          title: `${playerTitle(player)}`,
          player: player,
          rosterStatsByCode: {},
          teamStats: {} as TeamStatSet,
          avgEfficiency:
            efficiencyAverages[
              `${playerCareerParams.gender}_${DateUtils.getLongFormYear(
                player.year || ""
              )}`
            ] || efficiencyAverages.fallback,
          showGrades,
          grades: divisionStatsCache[player.year || "??"],
          showHelp,
          compressedPlayTypeStats: player.off_style as any,
          navigationLinkOverride: navigationOverride(
            DateUtils.fullYearFromShortYear(player.year || "") || ""
          ),
        }));
      } else {
        return selectedYearsDataTypeChain
          .filter(([year, dataType, playerSeason]) => {
            return year != playerYear || dataType != titleSuffix;
          })
          .map(([year, dataType, playerSeason]) => {
            const infix = !dataType
              ? "All"
              : dataType == "Conf Stats"
              ? "Conf"
              : "T100";

            // Inject like this so we don't need to recalculate every time
            if (!playerSeason.off_style && playerSeason.style) {
              (playerSeason as any).off_style =
                PlayTypeUtils.compressIndivPlayType(
                  playerSeason.style //(quick hack to re-use PlayerLeaderboardTable logic)
                );
            }

            return {
              title: `${year} (${infix})`,
              player: playerSeason,
              rosterStatsByCode: {},
              teamStats: {} as TeamStatSet,
              avgEfficiency:
                efficiencyAverages[
                  `${playerCareerParams.gender}_${DateUtils.getLongFormYear(
                    year
                  )}`
                ] || efficiencyAverages.fallback,
              showGrades,
              grades: divisionStatsCache[year || "??"],
              showHelp,
              compressedPlayTypeStats: playerSeason.off_style as any,
              navigationLinkOverride: navigationOverride(
                DateUtils.fullYearFromShortYear(year) || ""
              ),
            };
          });
      }
    });

    // Shot charts

    // Inject like this so we don't need to recalculate every time
    if (!player.off_shots && player.shotInfo) {
      (player as any).off_shots = ShotChartUtils.decompressHexData(
        player.shotInfo as any
      );
    }

    const shotChartQuickSwitchOptions = _.thru(isSimilarPlayer, () => {
      if (isSimilarPlayer) {
        // (just allow comparison vs currPlayerSelected)
        return [
          {
            title: `${currPlayerSelected.key}`,
            gender: currPlayerSelected.gender || ParamDefaults.defaultGender,
            off: currPlayerSelected.off_shots as any,
          },
        ];
      } else if (playerSimilarityMode) {
        return similarOrPinnedPlayers.map((player) => ({
          title: `${playerTitle(player)}`,
          gender: player.gender || ParamDefaults.defaultGender,
          off: player.off_shots as any,
        }));
      } else {
        return selectedYearsDataTypeChain
          .filter(([year, dataType, playerSeason]) => {
            return year != playerYear || dataType != titleSuffix;
          })
          .map(([year, dataType, playerSeason]) => {
            const infix = !dataType
              ? "All"
              : dataType == "Conf Stats"
              ? "Conf"
              : "T100";

            // Inject like this so we don't need to recalculate every time
            if (!playerSeason.off_shots && playerSeason.shotInfo) {
              (playerSeason as any).off_shots =
                ShotChartUtils.decompressHexData(playerSeason.shotInfo as any);
            }

            return {
              title: `${year} (${infix})`,
              gender: playerCareerParams.gender || ParamDefaults.defaultGender,
              off: playerSeason.off_shots as any,
              def: {},
            };
          });
      }
    });

    // If we're in short form grades mode then build those:

    if (showGrades && !showStandaloneGrades) {
      //TODO: make this a generic feature so can re-use in one line:
      const { tierToUse, gradeFormat, ...unused } =
        GradeTableUtils.buildPlayerTierInfo(
          showGrades || "rank:Combo",
          {
            comboTier: divisionStatsCacheByYear.Combo,
            highTier: divisionStatsCacheByYear.High,
            mediumTier: divisionStatsCacheByYear.Medium,
            lowTier: divisionStatsCacheByYear.Low,
          },
          positionalStatsCache[player.year || ParamDefaults.defaultYear] || {}
        );

      const predictedGrades = tierToUse
        ? GradeUtils.buildPlayerPercentiles(
            tierToUse,
            player,
            _.keys(GradeUtils.playerFields),
            gradeFormat == "rank"
          )
        : {};

      GradeTableUtils.injectPlayerSampleSizeDisclaimers(
        //(adds "extraInfo" to predicted grades)
        player,
        predictedGrades
      );
      player.grades = predictedGrades;
    }

    // Title

    const shortTitle =
      titleSuffix == "Conf Stats"
        ? " (Conf)"
        : titleSuffix == "vs T100"
        ? " (T100)"
        : "";
    const confNickname = ConferenceToNickname[player.conf || "??"] || "???";

    const titleSuffixKey =
      titleSuffix == "Conf Stats"
        ? "conf"
        : titleSuffix == "vs T100"
        ? "t100"
        : "all";
    const adjMarginShadow = CommonTableDefs.getTextShadow(
      { value: adjMargin },
      CbbColors.diff10_p100_redGreen[0],
      "20px",
      4
    );
    const adjMarginEl = (
      <OverlayTrigger
        placement="auto"
        overlay={
          <Tooltip
            id={`${player.code}${player.year}${titleSuffixKey}rapmMargin`}
          >
            Overall player RAPM impact, in pts/100 above average.
          </Tooltip>
        }
      >
        <span>
          <b>net: </b>
          <b style={adjMarginShadow}>
            [{(adjMargin > 0 ? "+" : "") + adjMargin.toFixed(1)}]
          </b>
          {_.thru(
            showGrades && !showStandaloneGrades,
            (showInlineRapmNetGrade) => {
              if (showInlineRapmNetGrade) {
                const netRapmField = factorMins
                  ? "off_adj_rapm_prod_margin"
                  : "off_adj_rapm_margin";
                return (
                  <div>
                    {" "}
                    {GradeTableUtils.buildPlayerNetGrade(
                      (player?.grades as Record<string, Statistic>)?.[
                        netRapmField
                      ],
                      GradeTableUtils.getGradeType(showGrades),
                      true,
                      true
                    )}
                  </div>
                );
              } else {
                return undefined;
              }
            }
          )}
        </span>
      </OverlayTrigger>
    );
    const shortPlayerMeta = (
      <span>
        <i>
          <small>{player.roster?.height || ""}</small>{" "}
          <small>{player.roster?.year_class || ""}</small>{" "}
          <OverlayTrigger
            placement="auto"
            overlay={TableDisplayUtils.buildPositionTooltip(
              player.posClass || "??",
              "season",
              true
            )}
          >
            <small>{player.posClass || "??"}</small>
          </OverlayTrigger>
        </i>
      </span>
    );

    const formattedTitleOverride = titleOverride ? (
      <div>
        <OverlayTrigger
          placement="auto"
          overlay={
            <Tooltip
              id={`${player.code}${player.year}${titleSuffixKey}OverlayTeamView`}
            >
              Open the Team view with the same visualizations open{shortTitle}.
            </Tooltip>
          }
        >
          <a
            target="_blank"
            href={UrlRouting.getGameUrl(
              {
                ...teamParams(fullYear),
                showInfoSubHeader,
                showPlayerPlayTypes: showPlayerPlayTypes,
                playerShotCharts: showShotCharts,
                showGrades: showGrades,
              },
              {}
            )}
          >
            <b>{titleOverride}</b>
          </a>
        </OverlayTrigger>
        <br /> {expandedView ? adjMarginEl : shortPlayerMeta}
      </div>
    ) : undefined;

    player.off_title = formattedTitleOverride || (
      <div className="multi_line_title_content">
        <div className="multi_line_title_row">
          <span className="multi_line_title_row_left_aligned_snippet">
            {/* Pin/Unpin icons for similar/pinned players */}
            {playerSimilarityMode &&
              pinnedPlayers.some((p) => p._id === player._id) &&
              !pinnedPlayerDiags[player._id as string] && (
                <OverlayTrigger
                  placement="top"
                  overlay={
                    <Tooltip id={`remove-${player._id}`}>
                      {pinnedPlayers.some((p) => p._id === player._id)
                        ? "Unpin"
                        : "Hide"}{" "}
                      this player
                    </Tooltip>
                  }
                >
                  <a
                    href="#"
                    onClick={(e: any) => {
                      e.preventDefault();
                      hidePlayer(player._id as string);
                    }}
                    className="mr-1"
                    style={{ fontSize: "0.8em" }}
                  >
                    <FontAwesomeIcon icon={faMinusSquare} />
                  </a>
                </OverlayTrigger>
              )}
            {player.year}+<b>{shortTitle}</b>
          </span>
          &nbsp;
          {isSimilarPlayer ? (
            <OverlayTrigger
              placement="auto"
              overlay={
                <Tooltip
                  id={`${player.code}${player.year}${titleSuffixKey}SimilarPlayer`}
                >
                  View this player's career page in a new tab
                </Tooltip>
              }
            >
              <a
                target="_blank"
                href={UrlRouting.getPlayerCareer({
                  ncaaId: player.roster?.ncaa_id || "",
                })}
              >
                <b>{player.key}</b>
              </a>
            </OverlayTrigger>
          ) : (
            <b>{player.key}</b>
          )}
        </div>
        {expandedView ? undefined : (
          <div className="multi_line_title_row d-lg-none">
            {shortPlayerMeta}
          </div>
        )}
        <div className="multi_line_title_row">
          <span className="multi_line_title_row_left_aligned_snippet">
            <span>
              <OverlayTrigger
                placement="auto"
                overlay={
                  <Tooltip
                    id={`${player.code}${player.year}${titleSuffixKey}TeamView`}
                  >
                    Open the Team view with the same visualizations open
                    {shortTitle}.
                  </Tooltip>
                }
              >
                <a
                  target="_blank"
                  href={UrlRouting.getGameUrl(
                    {
                      ...teamParams(fullYear),
                      showInfoSubHeader,
                      showPlayerPlayTypes: showPlayerPlayTypes,
                      playerShotCharts: showShotCharts,
                      showGrades: showGrades,
                    },
                    {}
                  )}
                >
                  {player.team}
                </a>
              </OverlayTrigger>
              &nbsp;(<span>{confNickname}</span>)&nbsp;
            </span>
          </span>{" "}
          {expandedView ? (
            adjMarginEl
          ) : (
            <div className="d-none d-lg-block">{shortPlayerMeta}</div>
          )}
        </div>
      </div>
    );

    // Finally build rows

    return playerDiffMode
      ? _.flatten([
          [GenericTableOps.buildDataRow(player, offPrefixFn, offCellMetaFn)],
          expandedView
            ? [
                GenericTableOps.buildDataRow(
                  player,
                  defPrefixFn,
                  defCellMetaFn,
                  undefined,
                  rosterInfoSpanCalculator
                ),
              ]
            : [],
          maybeCompDiag
            ? [
                GenericTableOps.buildTextRow(
                  <SimilarityDiagnosticView
                    diagnostics={maybeCompDiag}
                    config={similarityConfig}
                    theme={resolvedTheme}
                    playerId={player._id as string}
                    playerName={player.key}
                    isPinned={pinnedPlayers.some((p) => p._id === player._id)}
                    isPinnedPlayersOnlyView={false}
                    onPinPlayer={() => pinPlayer(player, maybeCompDiag)}
                    onUnpinPlayer={() => unpinPlayer(player._id as string)}
                    onHidePlayer={() => hidePlayer(player._id as string)}
                  />,
                  "p-0"
                ),
              ]
            : [],
        ])
      : _.flatten([
          !topYear && showEveryYear
            ? [
                GenericTableOps.buildHeaderRepeatRow(
                  CommonTableDefs.repeatingOnOffIndivHeaderFields,
                  "small"
                ),
              ]
            : [],
          [GenericTableOps.buildDataRow(player, offPrefixFn, offCellMetaFn)],
          expandedView
            ? [
                GenericTableOps.buildDataRow(
                  player,
                  defPrefixFn,
                  defCellMetaFn,
                  undefined,
                  rosterInfoSpanCalculator
                ),
              ]
            : [],
          comparisonPlayer && isPlayerCompSource
            ? playerRowBuilder(
                comparisonPlayer,
                comparisonPlayer.year || "????",
                true,
                undefined,
                undefined,
                true
              )
            : [],
          diffMode && isPlayerCompSource && !_.isEmpty(similarOrPinnedPlayers)
            ? [
                GenericTableOps.buildTextRow(
                  <QuickSwitchBar
                    title={diffQuickSwitch || "Select Player"}
                    titlePrefix="Compare With:"
                    quickSwitch={diffQuickSwitch}
                    quickSwitchExtra="extra"
                    quickSwitchOptions={similarOrPinnedPlayers.map((p) => ({
                      title: `${playerTitle(p)}`,
                    }))}
                    updateQuickSwitch={(
                      quickSwitch: string | undefined,
                      newTitle: string | undefined,
                      source: any,
                      fromTimer: boolean
                    ) => {
                      setDiffQuickSwitch(newTitle || "");
                      setComparisonPlayer(
                        similarOrPinnedPlayers.find(
                          (p) => playerTitle(p) == newTitle
                        )
                      );
                    }}
                    quickSwitchTimer={undefined}
                    setQuickSwitchTimer={() => {}}
                    modes={["extra_down"]}
                    theme={resolvedTheme}
                  />,
                  "text-center small"
                ),
              ]
            : [],
          showStandaloneGrades
            ? GradeTableUtils.buildPlayerGradeTableRows({
                isFullSelection: !titleSuffix,
                selectionTitle: `Grades`,
                config: showGrades,
                setConfig: (newConfig: string) => setShowGrades(newConfig),
                playerStats: {
                  comboTier: divisionStatsCacheByYear.Combo,
                  highTier: divisionStatsCacheByYear.High,
                  mediumTier: divisionStatsCacheByYear.Medium,
                  lowTier: divisionStatsCacheByYear.Low,
                },
                playerPosStats: positionalStatsCache[player.year || "??"] || {},
                player,
                expandedView,
                possAsPct,
                factorMins,
                includeRapm: true,
                leaderboardMode: true,
              })
            : [],
          showShotCharts &&
          fullYear >= DateUtils.firstYearWithShotChartData &&
          player.shotInfo &&
          (!isSimilarPlayer || !diffMode)
            ? [
                (player.shotInfo as any).data
                  ? GenericTableOps.buildTextRow(
                      <ShotChartDiagView
                        title={player.key}
                        off={
                          (player.off_shots ||
                            ShotChartUtils.decompressHexData(
                              player.shotInfo as any
                            )) as any
                        }
                        def={{}}
                        gender={
                          (playerCareerParams.gender ||
                            ParamDefaults.defaultGender) as "Men" | "Women"
                        }
                        quickSwitchOptions={shotChartQuickSwitchOptions as any}
                        chartOpts={{
                          ...shotChartConfig,
                          quickSwitch: comparisonPlayer?.key
                            ? `${playerTitle(
                                comparisonPlayer
                              )}${quickSwitchDelim}extra`
                            : undefined,
                        }}
                        onChangeChartOpts={(newOpts: any) => {
                          setShotChartConfig(newOpts);

                          //TODO quick switch is more complex
                          // but in similarity mode, we'll treat the currently selected player as a special case
                          if (isPlayerCompSource && diffMode) {
                            const newPlayer = similarOrPinnedPlayers.find(
                              (p) =>
                                p &&
                                `${playerTitle(p)}${quickSwitchDelim}extra` ==
                                  newOpts.quickSwitch
                            );
                            setComparisonPlayer(newPlayer);
                            setDiffQuickSwitch(
                              newPlayer ? playerTitle(newPlayer) : ""
                            );
                          }
                        }}
                        dynamicQuickSwitch={diffMode && isPlayerCompSource}
                        quickSwitchModesOverride={
                          diffMode && isPlayerCompSource && diffQuickSwitch
                            ? ["extra_right"]
                            : undefined
                        }
                        quickSwitchAtBottom={diffMode && isPlayerCompSource}
                      />,
                      "small"
                    )
                  : GenericTableOps.buildTextRow(
                      <ShotZoneChartDiagView
                        gender={
                          (playerCareerParams.gender ||
                            ParamDefaults.defaultGender) as "Men" | "Women"
                        }
                        off={player.shotInfo as any}
                        chartOpts={shotChartConfig}
                        onChangeChartOpts={(newOpts: any) => {
                          setShotChartConfig(newOpts);
                        }}
                      />,
                      "small"
                    ),
              ]
            : [],
          showPlayerPlayTypes &&
          player.off_style &&
          (!isSimilarPlayer || !diffMode)
            ? [
                GenericTableOps.buildTextRow(
                  <IndivPlayTypeDiagRadar
                    title={player.key}
                    player={player}
                    rosterStatsByCode={{}}
                    teamStats={{} as TeamStatSet}
                    avgEfficiency={
                      efficiencyAverages[
                        `${
                          playerCareerParams.gender
                        }_${DateUtils.getLongFormYear(player.year || "")}`
                      ] || efficiencyAverages.fallback
                    }
                    onChangeChartOpts={(opts: PlayerStyleOpts) => {
                      setShowPlayerPlayTypesPlayType(opts.playType);
                      setShowPlayerPlayTypesAdjPpp(!(opts.rawPpp ?? false));

                      //TODO quick switch is more complex
                      // but in similarity mode, we'll treat the currently selected player as a special case
                      if (isPlayerCompSource && diffMode) {
                        const newPlayer = similarOrPinnedPlayers.find(
                          (p) =>
                            `${playerTitle(p)}${quickSwitchDelim}extra` ==
                            opts.quickSwitch
                        );
                        setComparisonPlayer(newPlayer);
                        setDiffQuickSwitch(
                          newPlayer ? playerTitle(newPlayer) : ""
                        );
                      }
                    }}
                    userOpts={{
                      playType: showPlayerPlayTypesPlayType,
                      rawPpp: !showPlayerPlayTypesAdjPpp,
                      quickSwitch: comparisonPlayer?.key
                        ? `${playerTitle(
                            comparisonPlayer
                          )}${quickSwitchDelim}extra`
                        : undefined,
                    }}
                    quickSwitchOptions={playStyleQuickSwitchOptions}
                    showGrades={showGrades}
                    grades={divisionStatsCache[player.year || "??"]}
                    showHelp={showHelp}
                    compressedPlayTypeStats={player.off_style as any}
                    navigationLinkOverride={navigationOverride(fullYear)}
                    dynamicQuickSwitch={diffMode && isPlayerCompSource}
                    quickSwitchModesOverride={
                      diffMode && isPlayerCompSource && diffQuickSwitch
                        ? ["extra_down"]
                        : undefined
                    }
                    quickSwitchAtBottom={diffMode && isPlayerCompSource}
                  />,
                  "small"
                ),
              ]
            : [],
        ]);
  };

  const tableDataPhase1Chain = selectedYearsChain
    .take(playerSimilarityMode ? 1 : 1e9)
    .flatMap(([year, playerCareerInfo], index) => {
      const topYear = index == 0;
      const seasonRows = showAll
        ? playerRowBuilder(playerCareerInfo.season, year, topYear)
        : [];
      const confRows =
        playerCareerInfo.conf && showConf
          ? playerRowBuilder(
              playerCareerInfo.conf,
              year,
              topYear || showAll,
              showAll && !extraCharts ? "Conf Stats" : undefined,
              "Conf Stats"
            )
          : [];
      const t100Rows =
        playerCareerInfo.t100 && showT100
          ? playerRowBuilder(
              playerCareerInfo.t100,
              year,
              topYear || showAll || showConf,
              (showAll || showConf) && !extraCharts ? "vs T100" : undefined,
              "vs T100"
            )
          : [];

      const seasonRowIsTopRow = topYear;
      const confRowIsTopRow = _.isEmpty(seasonRows) && topYear;
      const t100RowIsTopRow =
        _.isEmpty(seasonRows) && _.isEmpty(confRows) && topYear;

      return _.flatten([
        seasonRowIsTopRow || _.isEmpty(seasonRows)
          ? []
          : [GenericTableOps.buildRowSeparator("1px")],
        seasonRows,
        confRowIsTopRow || _.isEmpty(confRows)
          ? []
          : [GenericTableOps.buildRowSeparator("1px")],
        confRows,
        t100RowIsTopRow || _.isEmpty(t100Rows)
          ? []
          : [GenericTableOps.buildRowSeparator("1px")],
        t100Rows,
        // Create QuickSwitchBar for diff mode,
      ]);
    });

  // Add function to remove pinned player
  const removePinnedPlayer = (playerId: string) => {
    setPinnedPlayers((curr) => curr.filter((p) => p._id !== playerId));
    setPinnedPlayerDiags((curr) => _.omit(curr, [playerId]));
  };

  // Add function to add pinned player
  const addPinnedPlayer = (
    ncaaId: string,
    gender: string,
    maybeSingleSeason?: string
  ) => {
    const currentJsonEpoch =
      dataLastUpdated[`${gender}_${DateUtils.coreYears[0]}`] || -1;

    const allPromises = Promise.all(
      RequestUtils.requestHandlingLogic(
        { gender, ncaaId },
        ParamPrefixes.playerCareer,
        [],
        (url: string, force: boolean) => {
          return fetchWithRetry(url).then(
            (response: fetch.IsomorphicResponse) => {
              return response
                .json()
                .then((json: any) => [json, response.ok, response]);
            }
          );
        },
        currentJsonEpoch,
        isDebug
      )
    );
    allPromises.then((jsons) => {
      const playerJsons = (jsons?.[0]?.responses?.[0]?.hits?.hits || [])
        .map((p: any) => {
          const source = p._source || {};
          source._id = p._id;
          return source;
        })
        .filter(
          (p: any) =>
            !_.isEmpty(p) &&
            _.endsWith(p._id, "_all") &&
            (!maybeSingleSeason || maybeSingleSeason == p._id)
        );

      // The key should be the same everywhere so we'll pick the first one
      setPinnedPlayers((curr) => {
        const newPinnedPlayers = _.uniqBy(
          curr.concat(playerJsons),
          (p) => p._id
        );
        if (_.isEmpty(similarPlayers)) {
          // Special cutdown request similar players mode before we have a full dashboard
          setTimeout(
            () => requestSimilarPlayers(false, true, newPinnedPlayers),
            0
          );
        } else {
          // Just wait for pinned players and re-request
          setTimeout(
            () => requestSimilarPlayers(false, false, newPinnedPlayers),
            0
          );
        }
        return newPinnedPlayers;
      });
    });
  };

  // Helper functions for pinning/unpinning players
  const pinPlayer = (
    player: IndivCareerStatSet,
    diag: SimilarityDiagnostics
  ) => {
    setPinnedPlayers((prev) => _.uniqBy([...prev, player], (p) => p._id));
    setPinnedPlayerDiags((prev) => ({
      ...prev,
      [player._id as string]: diag,
    }));
    // Remove from unpinned if it was there
    setUnpinnedPlayerIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(player._id as string);
      return newSet;
    });
  };

  const hidePlayer = (playerId: string) => {
    // If this player is currently selected as comparison player, clear the selection
    if (comparisonPlayer && comparisonPlayer._id === playerId) {
      setComparisonPlayer(undefined);
      setDiffQuickSwitch("");
    }

    // Check if it's in pinned players
    if (_.isEmpty(similarPlayers)) {
      //(only showing pinned players)
      removePinnedPlayer(playerId);
    } else {
      removePinnedPlayer(playerId);
      setUnpinnedPlayerIds((prev) => new Set([...Array.from(prev), playerId]));
    }
  };

  const unpinPlayer = (playerId: string) => {
    removePinnedPlayer(playerId);
  };

  const unmutePlayer = (playerId: string) => {
    setUnpinnedPlayerIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(playerId);
      return newSet;
    });
  };

  const requestSimilarPlayers = (
    showNextYearOverride?: boolean,
    pinnedPlayersOnlyMode?: boolean,
    updatedPinnedPlayers?: IndivCareerStatSet[]
  ) => {
    if (currPlayerSelected) {
      const gender = playerCareerParams.gender || ParamDefaults.defaultGender;

      setRetrievingPlayers(true);
      setComparisonPlayer(undefined);
      setDiffQuickSwitch("");

      const currentJsonEpoch =
        dataLastUpdated[`${gender}_${DateUtils.coreYears[0]}`] || -1;

      // Build additional query filters based on config
      const similarityFilters =
        PlayerSimilarityUtils.buildSimilarityQueryFilters(
          currPlayerSelected,
          similarityConfig
        );

      // Build style grades to help make decision

      const possPctUsgDivisonStats =
        divisionStatsCache[currPlayerSelected.year || "??"]?.Combo;
      const possPctUsgGrades =
        currPlayerSelected.style && possPctUsgDivisonStats
          ? GradeUtils.getIndivPlayStyleStats(
              currPlayerSelected.style,
              possPctUsgDivisonStats,
              undefined,
              true,
              true
            )
          : undefined;

      // Combine user's advanced query with auto-generated filters
      const combinedQuery = [
        similarityConfig.advancedQuery,
        similarityFilters.query,
      ]
        .filter((q) => q && q.trim())
        .map((p) => `(${p})`)
        .join(" AND ");

      const canUseVectorCache =
        vectorCache && vectorCache.query === combinedQuery;

      // Step 1: Get lean candidate data using optimized similarity API
      const allPromises = canUseVectorCache
        ? Promise.resolve({
            candidateVectors: vectorCache.candidateVectors,
            candidateIds: vectorCache.candidateIds,
            zScores: vectorCache.zScores,
            maybeDiags: undefined,
          })
        : Promise.all(
            RequestUtils.requestHandlingLogic(
              {
                gender,
                size: PlayerSimilarityUtils.firstPassPlayersRetrieved,
                queryVector:
                  PlayerSimilarityUtils.buildSimplePlayerSimilarityVector(
                    currPlayerSelected
                  ).join(","),
                queryPos: currPlayerSelected.posClass,
                extraSimilarityQuery: combinedQuery,
                ...(similarityFilters.runtimeMappingNames
                  ? {
                      runtimeMappingNames:
                        similarityFilters.runtimeMappingNames,
                    }
                  : {}),
              },
              ParamPrefixes.similarPlayers,
              [],
              (url: string, force: boolean) => {
                return fetchWithRetry(url).then(
                  (response: fetch.IsomorphicResponse) => {
                    return response
                      .json()
                      .then((json: any) => [json, response.ok, response]);
                  }
                );
              },
              Number.NaN, //(bypass cache)
              isDebug
            )
          ).then(async (jsons) => {
            // Parse lean candidate data from docvalue_fields (keep in flat format)
            const candidateHits = jsons?.[0]?.responses?.[0]?.hits?.hits || [];
            const flatCandidates = candidateHits
              .filter((hit: any) => {
                return (
                  hit._id !== currPlayerSelected._id &&
                  _.endsWith(hit._id, "_all")
                );
              })
              .map((hit: any) => ({
                _id: hit._id,
                fields: hit.fields || {},
              }));

            if (flatCandidates.length === 0) {
              setSimilarPlayers([]);
              setSimilarityDiagnostics([]);
              setRetrievingPlayers(false);
              return;
            }
            // Calculate vectors for all candidates in flat format
            const candidateVectors = flatCandidates.map(
              (candidate: any) =>
                PlayerSimilarityUtils.buildUnweightedPlayerSimilarityVectorFromFlat(
                  candidate.fields,
                  similarityConfig
                ).vector
            );
            const candidateIds = flatCandidates.map(
              (c: any) => c._id as string
            );

            const { diags, zScores } =
              PlayerSimilarityUtils.playerSimilarityLogic<string>(
                currPlayerSelected,
                similarityConfig,
                candidateVectors,
                (idx: number) => candidateIds[idx],
                undefined,
                possPctUsgGrades
              );

            // Store in cache for future use
            setVectorCache({
              query: combinedQuery,
              candidateVectors,
              candidateIds,
              zScores,
            });

            return {
              candidateVectors,
              candidateIds,
              zScores,
              maybeDiags: diags,
            };
          });
      allPromises
        .then(async (queryResult) => {
          const {
            candidateVectors,
            candidateIds,
            zScores: zScoresIn,
            maybeDiags,
          } = queryResult || {
            candidateVectors: [],
            candidateIds: [],
            zScores: { means: [], stdDevs: [] },
            maybeDiags: undefined,
          };
          try {
            // Step 2: Apply z-score based similarity calculation using flat format

            const { diags, zScores } = maybeDiags
              ? { diags: maybeDiags, zScores: zScoresIn }
              : PlayerSimilarityUtils.playerSimilarityLogic<string>(
                  currPlayerSelected,
                  similarityConfig,
                  candidateVectors,
                  (idx: number) => candidateIds[idx],
                  undefined,
                  possPctUsgGrades
                );

            if (pinnedPlayersOnlyMode && updatedPinnedPlayers) {
              // Bypass all the following logic we just want to generate scores

              const finalResults = PlayerSimilarityUtils.findSimilarPlayers(
                currPlayerSelected,
                {
                  ...similarityConfig,
                  comparisonPlayersCount: updatedPinnedPlayers.length,
                },
                updatedPinnedPlayers,
                zScores,
                possPctUsgGrades
              );
              setPinnedPlayerDiags((curr) => ({
                ...curr,
                ..._.chain(finalResults)
                  .map(({ obj, diagnostics }) => [
                    obj._id as string,
                    diagnostics,
                  ])
                  .fromPairs()
                  .value(),
              }));
            } else {
              const topNIds = diags.map((sortedRes) => sortedRes.obj);

              // Add next year IDs if showNextYear is enabled
              let idsToFetch = [...topNIds];
              if (showNextYearOverride ?? showNextYear) {
                const currentSeasonYear = parseInt(
                  DateUtils.inSeasonYear.split("/")[0]
                );
                topNIds.forEach((id) => {
                  const parts = id.split("_");
                  if (parts.length >= 3) {
                    const year = parseInt(parts[2]);
                    const nextYear = year + 1;
                    if (nextYear <= currentSeasonYear) {
                      const nextYearId = `${parts[0]}_${parts[1]}_${nextYear}_${parts[3]}`;
                      idsToFetch.push(nextYearId);
                    }
                  }
                });
              }

              // Step 3: Fetch full documents for top N players (and next year if enabled)
              const fullDocsPromise = Promise.all(
                RequestUtils.requestHandlingLogic(
                  {
                    gender,
                    ids: idsToFetch.join(","),
                  } as any,
                  ParamPrefixes.multiPlayerCareer,
                  [],
                  (url: string, force: boolean) => {
                    return fetchWithRetry(url).then(
                      (response: fetch.IsomorphicResponse) => {
                        return response
                          .json()
                          .then((json: any) => [json, response.ok, response]);
                      }
                    );
                  },
                  Number.NaN, //(bypass cache)
                  isDebug
                )
              );

              const fullDocsResponse = await fullDocsPromise;
              const allFetchedPlayers = (
                fullDocsResponse?.[0]?.responses?.[0]?.hits?.hits || []
              )
                .map((p: any) => {
                  const source = p._source || {};
                  source._id = p._id;
                  return source;
                })
                .filter((p: any) => !_.isEmpty(p));

              // Separate current year players from next year players
              const fullPlayers: any[] = [];
              const nextYearPlayersMap = new Map<string, any>(); // playerId -> nextYearPlayer

              allFetchedPlayers.forEach((player: any) => {
                const playerId = player._id.split("_")[0]; // Extract base player ID
                if (topNIds.includes(player._id)) {
                  // This is an original player
                  fullPlayers.push(player);
                } else {
                  // This is a next year player, store it mapped to its owner
                  nextYearPlayersMap.set(playerId, player);
                }
              });

              // Match next year players to their owners
              if (showNextYearOverride ?? showNextYear) {
                fullPlayers.forEach((player: any) => {
                  const playerId = player._id.split("_")[0];
                  const nextYearPlayer = nextYearPlayersMap.get(playerId);
                  if (nextYearPlayer) {
                    player.nextYear = nextYearPlayer;
                  }
                });
              }

              // Step 4: Re-score with full data to get diagnostics and proper ordering
              // Add pinned players to the candidate list before re-scoring
              const pinnedPlayersToUse = updatedPinnedPlayers || pinnedPlayers;
              const allCandidates = _.uniqBy(
                [...fullPlayers, ...pinnedPlayersToUse],
                (p) => p._id
              );
              const pinnedIdSet = new Set(
                pinnedPlayersToUse.map((p) => p._id as string)
              );
              const finalResults = PlayerSimilarityUtils.findSimilarPlayers(
                currPlayerSelected,
                {
                  ...similarityConfig,
                  comparisonPlayersCount:
                    similarityConfig.comparisonPlayersCount +
                    pinnedPlayersToUse.length,
                },
                allCandidates,
                zScores,
                possPctUsgGrades
              );

              // Set results
              const formattedResults = finalResults.map((result) => result.obj);
              const diagnostics = finalResults.map(
                (result) => result.diagnostics
              );
              const pinnedIdDiags: Record<string, SimilarityDiagnostics> =
                _.chain(formattedResults)
                  .flatMap((p, idx) =>
                    pinnedIdSet.has(p._id as string)
                      ? [{ _id: p._id as string, idx }]
                      : []
                  )
                  .map(({ _id, idx }) => [_id, diagnostics[idx]])
                  .fromPairs()
                  .value();
              setPinnedPlayerDiags(pinnedIdDiags);

              setSimilarPlayers(formattedResults);
              setSimilarityDiagnostics(diagnostics);
            }
          } catch (error) {
            if (isDebug) {
              console.log(`Similarity calculation failed:`, error);
            }
            // Fallback to empty list - we can't easily convert flat format to full format
            setSimilarPlayers([]);
            setSimilarityDiagnostics([]);
          }
          setRetrievingPlayers(false);
        })
        .catch((error) => {
          if (isDebug) {
            console.log(`API call failed:`, error);
          }
          setRetrievingPlayers(false);
          setSimilarPlayers([]);
          setSimilarityDiagnostics([]);
        });
    }
  };

  // Similarity controls component (separate variable but will be used in table)
  const similarityControlsComponent = (
    <SimilarityWeights
      config={similarityConfig}
      onConfigChange={setSimilarityConfig}
      onOpenAdvanced={() => setShowConfigModal(true)}
      showSliders={showSimilaritySliders}
      onToggleSliders={setShowSimilaritySliders}
    />
  );

  // Convert to table row
  const similarityControlsRow = GenericTableOps.buildTextRow(
    similarityControlsComponent,
    "text-center"
  );

  const playerFinderElement = (
    <div className="d-flex align-items-center">
      <OverlayTrigger
        placement="top"
        overlay={
          <Tooltip id="separate-seasons-tooltip-3">
            Switch between adding one player/season or all a player's seasons
            (currently:{" "}
            {separatePlayerSeasons
              ? "one player/season"
              : "all a player's seasons"}
            )
          </Tooltip>
        }
      >
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={() => setSeparatePlayerSeasons(!separatePlayerSeasons)}
          className="p-1 mr-1 mb-2"
        >
          <FontAwesomeIcon
            icon={separatePlayerSeasons ? faCalendar : faCalendarTimes}
          />
        </Button>
      </OverlayTrigger>
      <PlayerFinderTextBox
        placeholderText="Manually add comp..."
        onSelectPlayer={addPinnedPlayer}
        currGender={playerCareerParams.gender || ParamDefaults.defaultGender}
        playerCurrSelected={false}
        separatePlayerSeasons={separatePlayerSeasons}
      />
    </div>
  );

  const tableData = _.thru(playerSimilarityMode, (__) => {
    if (playerSimilarityMode) {
      const hasPlayers = !_.isEmpty(similarPlayers);

      if (!hasPlayers) {
        // Case 1 & 2: No similar players - show button with controls below
        const buttonRow = GenericTableOps.buildTextRow(
          <Row className="align-items-center">
            <Col lg={4} className="pr-2">
              {filterComponent}
            </Col>
            <Col xs={12} lg={4} className="text-center mb-2 mb-lg-0">
              <Button onClick={() => requestSimilarPlayers()}>
                Find Similar Players
              </Button>
            </Col>
            <Col
              xs={12}
              lg={4}
              className="d-flex align-items-center justify-content-lg-end justify-content-center"
            >
              {playerFinderElement}
            </Col>
          </Row>,
          "text-center"
        );

        return tableDataPhase1Chain
          .concat([buttonRow])
          .concat([similarityControlsRow])
          .concat([
            GenericTableOps.buildTextRow(
              <>
                {!_.isEmpty(pinnedPlayers) ? (
                  <div className="d-flex justify-content-center align-items-center position-relative w-100">
                    {/* Center-aligned content */}
                    <div>
                      <span>
                        PINNED PLAYERS ONLY:{" "}
                        <i className="text-muted">
                          (press "Find Similar Players" above to see more)
                        </i>
                      </span>
                    </div>

                    {/* Left-aligned "Remove all" link */}
                    <div className="position-absolute" style={{ left: 0 }}>
                      <OverlayTrigger
                        placement="top"
                        overlay={
                          <Tooltip id="remove-all-pinned-tooltip">
                            Remove all pinned players
                          </Tooltip>
                        }
                      >
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setPinnedPlayers([]);
                            setPinnedPlayerDiags({});
                          }}
                          className="text-muted"
                        >
                          <FontAwesomeIcon
                            icon={faMinusSquare}
                            className="mr-1"
                          />
                          all
                        </a>
                      </OverlayTrigger>
                    </div>
                  </div>
                ) : undefined}
                {_.isEmpty(pinnedPlayerDiags) && !_.isEmpty(pinnedPlayers) ? (
                  <>
                    <br />
                    <span>
                      (To show similarity scores: add a player, find similar
                      players, or{" "}
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          requestSimilarPlayers(false, true, pinnedPlayers);
                        }}
                      >
                        click here
                      </a>
                      )
                    </span>
                  </>
                ) : undefined}
              </>,
              "text-center"
            ),
          ])
          .concat(
            // If no similar players, ie user has not yet requested them, then show pinned players
            _.chain(pinnedPlayers)
              .filter(filterPlayer)
              .map((p) => ({ p, diags: pinnedPlayerDiags[p._id as string] }))
              .sortBy(({ p, diags }, i) =>
                diags ? diags.totalSimilarity : -10000000
              )
              .flatMap(({ p, diags }, i) => {
                const players = playerRowBuilder(p, p.year || "????", i == 0);
                return players
                  .concat(
                    diags
                      ? [
                          GenericTableOps.buildTextRow(
                            <SimilarityDiagnosticView
                              diagnostics={diags}
                              config={similarityConfig}
                              theme={resolvedTheme}
                              playerId={p._id as string}
                              playerName={p.key}
                              isPinned={true}
                              isPinnedPlayersOnlyView={true}
                              onPinPlayer={() => pinPlayer(p, diags)}
                              onUnpinPlayer={() => unpinPlayer(p._id as string)}
                              onHidePlayer={() => hidePlayer(p._id as string)}
                            />,
                            "p-0"
                          ),
                        ]
                      : []
                  )
                  .concat([GenericTableOps.buildRowSeparator("1px")]);
              })
              .value()
          )
          .value();
      } else {
        // Case 3 & 4: Has similar players - show header with experiment/hide settings link
        const experimentLink = showSimilaritySettings
          ? "hide settings"
          : "experiment";
        const similarityRow = GenericTableOps.buildTextRow(
          <Row className="align-items-center">
            {!showSimilaritySettings ? (
              <Col lg={4} className="pr-2">
                {filterComponent}
              </Col>
            ) : (
              <Col lg={4} />
            )}
            <Col
              xs={12}
              lg={4}
              className={`text-center ${
                showSimilaritySettings ? "" : "mb-2 mb-lg-0"
              }`}
            >
              <i>
                Similar Players: (
                <a
                  href="#"
                  onClick={(e: any) => {
                    e.preventDefault();
                    setSimilarPlayers([]);
                    setSimilarityDiagnostics([]);
                    setComparisonPlayer(undefined);
                    setDiffQuickSwitch("");
                    setUnpinnedPlayerIds(new Set());
                  }}
                >
                  clear
                </a>
                ) (
                <a
                  href="#"
                  onClick={(e: any) => {
                    e.preventDefault();
                    setShowSimilaritySettings(!showSimilaritySettings);
                  }}
                >
                  {experimentLink}
                </a>
                )
              </i>
            </Col>
            {!showSimilaritySettings ? (
              <Col
                xs={12}
                lg={4}
                className="d-flex align-items-center justify-content-lg-end justify-content-center"
              >
                {playerFinderElement}
              </Col>
            ) : (
              <Col lg={4} className="d-none d-lg-block">
                {/* Right spacer when no Add Player */}
              </Col>
            )}
          </Row>,
          "text-center"
        );

        const experimentButtonRow = showSimilaritySettings
          ? GenericTableOps.buildTextRow(
              <Row className="align-items-center">
                <Col lg={4} className="pr-2">
                  {filterComponent}
                </Col>
                <Col xs={12} lg={4} className="text-center mb-2 mb-lg-0">
                  <Button onClick={() => requestSimilarPlayers()}>
                    Find Similar Players
                  </Button>
                </Col>
                <Col
                  xs={12}
                  lg={4}
                  className="d-flex align-items-center justify-content-lg-end justify-content-center"
                >
                  {playerFinderElement}
                </Col>
              </Row>,
              "text-center"
            )
          : null;

        return tableDataPhase1Chain
          .concat([similarityRow])
          .concat(showSimilaritySettings ? [similarityControlsRow] : [])
          .concat(experimentButtonRow ? [experimentButtonRow] : [])
          .concat(
            _.flatMap(
              similarPlayers
                .filter(
                  (p) =>
                    !Array.from(unpinnedPlayerIds).includes(p._id as string)
                )
                .filter(filterPlayer)
                .filter(
                  (p) => !showPinnedOnly || pinnedPlayerDiags[p._id as string]
                ),
              (p, i) => {
                const players = playerRowBuilder(p, p.year || "????", i == 0);

                // Add next year player row if available
                const nextYearRows = p.nextYear
                  ? playerRowBuilder(
                      p.nextYear as IndivCareerStatSet,
                      (p.nextYear as any).year || "????",
                      false
                    )
                  : [];

                const extraSimilarityRows =
                  playerSimilarityMode &&
                  !_.isEmpty(players) &&
                  similarityDiagnostics[i]
                    ? [
                        GenericTableOps.buildTextRow(
                          <SimilarityDiagnosticView
                            diagnostics={similarityDiagnostics[i]}
                            config={similarityConfig}
                            theme={resolvedTheme}
                            playerId={p._id as string}
                            playerName={p.key}
                            isPinned={Boolean(
                              pinnedPlayerDiags[p._id as string]
                            )}
                            isPinnedPlayersOnlyView={false}
                            onPinPlayer={() =>
                              pinPlayer(p, similarityDiagnostics[i])
                            }
                            onUnpinPlayer={() => unpinPlayer(p._id as string)}
                            onHidePlayer={() => hidePlayer(p._id as string)}
                          />,
                          "p-0"
                        ),
                        GenericTableOps.buildRowSeparator("1px"),
                      ]
                    : [];
                return players.concat(nextYearRows).concat(extraSimilarityRows);
              }
            )
          )
          .concat(
            // Add muted players row if there are any unpinned players
            unpinnedPlayerIds.size > 0
              ? [
                  GenericTableOps.buildTextRow(
                    <div className="text-center text-muted">
                      <small>
                        Muted players (click to unmute):{" "}
                        {Array.from(unpinnedPlayerIds)
                          .map((playerId, index) => {
                            const mutedPlayer = similarPlayers.find(
                              (p) => p._id === playerId
                            );
                            if (!mutedPlayer) return null;

                            return (
                              <span key={playerId}>
                                {index > 0 && ", "}
                                <a
                                  href="#"
                                  onClick={(e: any) => {
                                    e.preventDefault();
                                    unmutePlayer(playerId);
                                  }}
                                >
                                  {`${playerTitle(mutedPlayer)}`}
                                </a>
                              </span>
                            );
                          })
                          .filter(Boolean)}
                      </small>
                    </div>,
                    "small"
                  ),
                ]
              : []
          )
          .value();
      }
    } else {
      return tableDataPhase1Chain.value();
    }
  });

  /** The sub-header builder - Can show some handy context in between the header and data rows: */
  const maybeSubheaderRow = showInfoSubHeader
    ? RosterTableUtils.buildInformationalSubheader(
        true,
        true,
        resolvedTheme == "dark"
      )
    : [];

  const table = (
    <GenericTable
      showConfigureColumns={true}
      tableCopyId="playerLeaderboardTable"
      tableFields={CommonTableDefs.onOffIndividualTable(
        expandedView,
        possAsPct,
        factorMins,
        true
      )}
      tableData={maybeSubheaderRow.concat(tableData)}
      cellTooltipMode="none"
      extraInfoLookups={{
        //(see buildLeaderboards)
        PREPROCESSING_WARNING:
          "The leaderboard version of this stat has been improved with some pre-processing so may not be identical to the on-demand values eg in the On/Off pages",
      }}
      integratedGrades={
        showGrades && !showStandaloneGrades
          ? {
              hybridMode:
                GradeTableUtils.showingHybridOrStandaloneGrades(showGrades),
              colorChooser: CbbColors.integratedColorsDefault,
              customKeyMappings: {
                def_3pr: "off_3p_ast",
                def_2primr: "off_2prim_ast",
              },
            }
          : undefined
      }
    />
  );
  // 4] Views

  const buildTopLevelGradeControls = !hideGlobalGradeSettings;
  const { controlRow: topLevelGradeControls } = _.thru(
    buildTopLevelGradeControls,
    (__) => {
      if (buildTopLevelGradeControls) {
        const yearToUseForTopLevelGradeControls =
          (!_.isEmpty(yearsToShow)
            ? Array.from(yearsToShow)
            : playerSeasonInfo.map((s) => s[0]))?.[0] || "??";
        const divisionStatsCacheByYear: DivisionStatsCache = showGrades
          ? divisionStatsCache[yearToUseForTopLevelGradeControls] || {}
          : {};
        return GradeTableUtils.buildPlayerGradeControlState(
          "",
          {
            selectionTitle: "Grades",
            config: showGrades,
            setConfig: (newConfig: string) => setShowGrades(newConfig),
            playerStats: {
              comboTier: divisionStatsCacheByYear.Combo,
              highTier: divisionStatsCacheByYear.High,
              mediumTier: divisionStatsCacheByYear.Medium,
              lowTier: divisionStatsCacheByYear.Low,
            },
            playerPosStats:
              positionalStatsCache[yearToUseForTopLevelGradeControls] || {},
          },
          {
            countsAreExample:
              (_.size(yearsToShow) || _.size(playerSeasonInfo)) > 1,
            onHide: () => {
              setHideGlobalGradeSettings(true);
            },
          }
        );
      } else {
        return { controlRow: undefined };
      }
    }
  );

  const quickToggleBar = (
    <ToggleButtonGroup
      items={playerSeasonInfo
        .map(
          (y, yIndex) =>
            ({
              label: y[0] + "+",
              tooltip:
                `Show / hide data for this year (starting ${y[0]})` +
                _.isEmpty(similarPlayers)
                  ? ""
                  : " (disabled until similar players cleared)",
              toggled:
                (playerSimilarityMode
                  ? _.isEmpty(yearsToShow) && yIndex == 0 //(player similarity mode, default to first year)
                  : _.isEmpty(yearsToShow)) || yearsToShow.has(y[0]),
              onClick: () => {
                if (playerSimilarityMode) {
                  //(currently - can only view one season/sample at a time)
                  setYearsToShow(new Set([y[0]]));
                } else {
                  const newYearSet = _.isEmpty(yearsToShow)
                    ? new Set<string>(playerSeasonInfo.map((y) => y[0]))
                    : new Set(yearsToShow);
                  const currHasYear = newYearSet.has(y[0]);
                  if (currHasYear) {
                    newYearSet.delete(y[0]);
                  } else {
                    newYearSet.add(y[0]);
                  }
                  setYearsToShow(newYearSet);
                }
              },
            } as ToggleButtonItem)
        )
        .concat(
          [
            {
              label: " | ",
              isLabelOnly: true,
              toggled: false,
              onClick: () => null,
            },
            {
              label: "All",
              tooltip:
                "Show data for the player's stats vs all opposition" +
                _.isEmpty(similarPlayers)
                  ? ""
                  : " (disabled until similar players cleared)",
              toggled: showAll,
              disabled: !playerSimilarityMode && !showConf && !showT100,
              onClick: () => {
                if (playerSimilarityMode) {
                  //(currently - can only view one season/sample at a time)
                  setShowAll(true);
                  setShowConf(false);
                  setShowT100(false);
                } else {
                  if (showConf || showT100) {
                    setShowAll(!showAll);
                  }
                }
              },
            },
            {
              label: "Conf",
              tooltip:
                "Show data for the player's stats vs Conference opposition" +
                _.isEmpty(similarPlayers)
                  ? ""
                  : " (disabled until similar players cleared)",
              toggled: showConf,
              onClick: () => {
                if (playerSimilarityMode) {
                  //(currently - can only view one season/sample at a time)
                  setShowAll(false);
                  setShowConf(true);
                  setShowT100(false);
                } else {
                  if (!showAll && !showT100 && showConf) {
                    //revert back to showAll
                    setShowAll(true);
                  }
                  setShowConf(!showConf);
                }
              },
            },
            {
              label: "T100",
              tooltip:
                "Show data for the player's stats vs T100" +
                _.isEmpty(similarPlayers)
                  ? ""
                  : " (disabled until similar players cleared)",
              toggled: showT100,
              onClick: () => {
                if (playerSimilarityMode) {
                  //(currently - can only view one season/sample at a time)
                  setShowAll(false);
                  setShowConf(false);
                  setShowT100(true);
                } else {
                  if (!showAll && !showConf && showT100) {
                    //revert back to showAll
                    setShowAll(true);
                  }
                  setShowT100(!showT100);
                }
              },
            },
            {
              label: " | ",
              isLabelOnly: true,
              toggled: true,
              onClick: () => null,
            },
            {
              label: "Expanded",
              tooltip: expandedView
                ? "Show single row of player stats"
                : "Show expanded player stats",
              toggled: expandedView,
              onClick: () => setExpandedView(!expandedView),
            },
            {
              label: "Shots",
              tooltip: `Show simple shot zones (${DateUtils.firstYearWithShotChartData}+ only)`,
              toggled: showShotCharts,
              onClick: () => setShowShotCharts(!showShotCharts),
            },
            {
              label: "Style",
              tooltip: showPlayerPlayTypes
                ? "Hide play style breakdowns"
                : "Show play style breakdowns",
              toggled: showPlayerPlayTypes,
              onClick: () => setShowPlayerPlayTypes(!showPlayerPlayTypes),
            },
            {
              label: " | ",
              isLabelOnly: true,
              toggled: true,
              onClick: () => null,
            },
            {
              label: "Poss%",
              tooltip: possAsPct
                ? "Show possessions as count"
                : "Show possessions as percentage",
              toggled: possAsPct,
              onClick: () => setPossAsPct(!possAsPct),
            },
            {
              label: "+ Info",
              tooltip: showInfoSubHeader
                ? "Hide extra info sub-header"
                : "Show extra info sub-header",
              toggled: showInfoSubHeader,
              onClick: () => setShowInfoSubHeader(!showInfoSubHeader),
            },
          ].concat(
            playerSimilarityMode
              ? [
                  {
                    label: " | ",
                    isLabelOnly: true,
                    toggled: true,
                    onClick: () => null,
                  },
                  {
                    label: "Diffs",
                    tooltip:
                      "Diff mode: focuses the UI on comparing the source player vs their comps",
                    toggled: diffMode,
                    onClick: () => {
                      setDiffMode(!diffMode);
                    },
                  },
                  {
                    label: "Year+1",
                    tooltip: showNextYear
                      ? "Hide next year's data for similar players"
                      : "Show next year's data for similar players (if available)",
                    toggled: showNextYear,
                    disabled: !playerSimilarityMode, // Only available in similarity mode
                    onClick: () => {
                      const newShowNextYear = !showNextYear;
                      setShowNextYear(newShowNextYear);
                      if (similarPlayers.length > 0) {
                        //(if we have an active request, rerender it with the changes)
                        requestSimilarPlayers(newShowNextYear);
                      }
                    },
                  },
                ]
              : []
          )
        )}
    />
  );

  const optionsDropdown = (
    <GenericTogglingMenu size="sm">
      {playerSimilarityMode ? (
        <GenericTogglingMenuItem
          text="Show Similarity Config..."
          truthVal={showConfigModal}
          onSelect={() => setShowConfigModal(!showConfigModal)}
        />
      ) : undefined}
      <GenericTogglingMenuItem
        text="Show grade controls"
        truthVal={!hideGlobalGradeSettings}
        onSelect={() => setHideGlobalGradeSettings(!hideGlobalGradeSettings)}
      />
      <AnnotationMenuItems />
      <GenericTogglingMenuItem
        className="d-none d-md-flex"
        text="'Quick Select' Bar Is Sticky"
        truthVal={stickyQuickToggle}
        onSelect={() => setStickyQuickToggle(!stickyQuickToggle)}
      />
      <GenericTogglingMenuItem
        className="d-md-none"
        disabled={true}
        text="Sticky 'Quick Select' Bar Disabled"
        truthVal={false}
        onSelect={() => {}}
      />
    </GenericTogglingMenu>
  );

  return (
    <Container fluid>
      <LoadingOverlay
        spinner
        active={retrievingPlayers}
        text={"Finding similar players..."}
      >
        <StickyRow className="mb-2 w-100" stickyEnabled={stickyQuickToggle}>
          <Col sm="11">{quickToggleBar}</Col>
          <Form.Group as={Col} sm="1" className="mb-0">
            {optionsDropdown}
          </Form.Group>
          {topLevelGradeControls ? (
            <Col xs="12" className="pt-1">
              <div>{topLevelGradeControls}</div>
            </Col>
          ) : undefined}
        </StickyRow>
        <Row>{table}</Row>
      </LoadingOverlay>

      {/* Similarity Configuration Modal */}
      <SimilarityConfigModal
        show={showConfigModal}
        onHide={() => setShowConfigModal(false)}
        config={similarityConfig}
        onConfigChange={setSimilarityConfig}
        onApply={() => {
          setShowConfigModal(false);
          // Use setTimeout to ensure the config state update has been processed
          setTimeout(() => {
            requestSimilarPlayers();
          }, 0);
        }}
      />
    </Container>
  );
};

export default PlayerCareerTable;
