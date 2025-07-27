// React imports:
import React, { useState, useEffect, ReactNode } from "react";

// Lodash:
import _ from "lodash";

// Bootstrap imports:
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import Dropdown from "react-bootstrap/Dropdown";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import Button from "react-bootstrap/Button";

// Additional components:
// @ts-ignore
import LoadingOverlay from "@ronchalant/react-loading-overlay";
// @ts-ignore
import Select, { components } from "react-select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLink,
  faFilter,
  faClipboard,
  faDownload,
} from "@fortawesome/free-solid-svg-icons";
import ClipboardJS from "clipboard";

// Component imports
import GenericTable, { GenericTableOps } from "./GenericTable";
import GenericTogglingMenu from "./shared/GenericTogglingMenu";
import GenericTogglingMenuItem from "./shared/GenericTogglingMenuItem";
import ToggleButtonGroup from "./shared/ToggleButtonGroup";
import AsyncFormControl from "./shared/AsyncFormControl";
import { notFromFilterAutoSuggest } from "./shared/AdvancedFilterAutoSuggestText";

// Table building
import { TableDisplayUtils } from "../utils/tables/TableDisplayUtils";
import { LineupTableUtils } from "../utils/tables/LineupTableUtils";

// Util imports
import { UrlRouting } from "../utils/UrlRouting";
import { CommonTableDefs } from "../utils/tables/CommonTableDefs";
import { PositionUtils } from "../utils/stats/PositionUtils";
import { PlayerLeaderboardParams, ParamDefaults } from "../utils/FilterModels";
import {
  ConferenceToNickname,
  NicknameToConference,
  NonP6Conferences,
  Power6Conferences,
  effectivelyHighMajor,
} from "../utils/public-data/ConferenceInfo";

import { PlayerLeaderboardTracking } from "../utils/internal-data/LeaderboardTrackingLists";

import { RosterTableUtils } from "../utils/tables/RosterTableUtils";
import { AdvancedFilterUtils } from "../utils/AdvancedFilterUtils";
import { IndivStatSet, Statistic, TeamStatSet } from "../utils/StatModels";
import { TransferModel } from "../utils/LeaderboardUtils";
import { DateUtils } from "../utils/DateUtils";
import ConferenceSelector from "./shared/ConferenceSelector";
import {
  DivisionStatsCache,
  GradeTableUtils,
  PositionStatsCache,
} from "../utils/tables/GradeTableUtils";
import { TeamEditorUtils } from "../utils/stats/TeamEditorUtils";
import { efficiencyAverages } from "../utils/public-data/efficiencyAverages";
import { CbbColors } from "../utils/CbbColors";
import { GradeUtils } from "../utils/stats/GradeUtils";
import LinqExpressionBuilder from "./shared/LinqExpressionBuilder";
import { AvailableTeams } from "../utils/internal-data/AvailableTeams";

// Geo:
import dynamic from "next/dynamic";
import { Badge } from "react-bootstrap";
import { FeatureFlags } from "../utils/stats/FeatureFlags";
import StickyRow from "./shared/StickyRow";
import ShotZoneChartDiagView from "./diags/ShotZoneChartDiagView";
import IndivPlayTypeDiagRadar from "./diags/IndivPlayTypeDiagRadar";
import { useTheme } from "next-themes";
const PlayerGeoMapNoSsr = dynamic(() => import("./diags/PlayerGeoMap"), {
  ssr: false,
});

export type PlayerLeaderboardStatsModel = {
  players?: Array<any>;
  teams?: Record<string, any>;
  confs?: Array<string>;
  confMap?: Map<string, Array<string>>;
  transfers?: Record<string, Array<TransferModel>>;
  error?: string;
  syntheticData?: boolean; //(if true, can't use T100 and conf sub-filters)
};
type Props = {
  startingState: PlayerLeaderboardParams;
  dataEvent: PlayerLeaderboardStatsModel;
  onChangeState: (newParams: PlayerLeaderboardParams) => void;
  teamEditorMode?: (p: IndivStatSet) => void;
  geoMode?: boolean; //(if true display a map and have some basic filtering)
  testMode?: boolean;
};

// Some static methods

const yearOpt = {
  label: "Year",
  value: "desc:year",
};
const unsortedOpt = {
  label: "Unsorted",
  value: "unsorted",
};
const sortOptions: Array<any> = _.flatten(
  _.toPairs(CommonTableDefs.onOffIndividualTableAllFields(true))
    .filter((keycol) => keycol[1].colName && keycol[1].colName != "")
    .map((keycol) => {
      return [
        ["desc", "off"],
        ["asc", "off"],
        ["desc", "def"],
        ["asc", "def"],
        ["desc", "diff"],
        ["asc", "diff"],
      ].flatMap((combo) => {
        if (
          combo[1] == "diff" &&
          keycol[0] != "rtg" &&
          keycol[0] != "adj_rtg" &&
          keycol[0] != "adj_prod" &&
          keycol[0] != "adj_rapm" &&
          keycol[0] != "adj_rapm_prod" &&
          keycol[0] != "adj_opp"
        ) {
          // only do diff for a few:
          return [];
        }
        const ascOrDesc = (s: string) => {
          switch (s) {
            case "asc":
              return "Asc.";
            case "desc":
              return "Desc.";
          }
        };
        const offOrDef = (s: string) => {
          switch (s) {
            case "off":
              return "Offensive";
            case "def":
              return "Defensive";
            case "diff":
              return "Off-Def";
          }
        };
        const labelOverride =
          CommonTableDefs.indivColNameOverrides[`${combo[1]}_${keycol[0]}`];
        const ascOrDecLabel = ascOrDesc(combo[0]) || "";
        const offOrDefLabel = offOrDef(combo[1]) || "";
        const label = labelOverride
          ? labelOverride(ascOrDecLabel)
          : "see_below";
        return label
          ? [
              {
                label: !_.isNil(labelOverride)
                  ? label
                  : `${keycol[1].colName} (${ascOrDecLabel} / ${offOrDefLabel})`,
                value: `${combo[0]}:${combo[1]}_${keycol[0]}`,
              },
            ]
          : [];
      });
    })
);
const sortOptionsByValue = _.fromPairs(
  sortOptions
    .map((opt) => [opt.value, opt])
    .concat([
      [yearOpt.value, yearOpt],
      [unsortedOpt.value, unsortedOpt],
    ])
);

// Info required for the positional filter

const advancedFilterPresets = [
  ["Pass-first ball handlers", "off_usage <= 20% && off_assist >= 25%", "BH*"],
  [
    "Dribble-driving guards",
    "(1-off_2prim_ast)*off_2primr + 0.33*off_ftr > 40% SORT_BY (1-off_2prim_ast)*off_2primr + 0.33*off_ftr",
    "*G,WF",
  ],
  [
    "Off-the-dribble 3P-shooting guards",
    "off_3p_ast < 60% && off_3pr > 40% SORT_BY off_3p",
    "*G",
  ],

  [
    "3+D wings",
    "def_adj_rapm < -1.5 && off_3p > 35% && off_3pr >= 50%",
    "WG,WF",
  ],
  ["Safe-pair-of-hands wings", "off_to < 14%", "WG,WF"],

  [
    "Floor-stretching centers",
    "off_3pr > 25% || (off_3pr >= 5% && off_2pmidr > 35% && off_2pmid > 40%)",
    "PF/C,C",
  ],
  [
    "Elite passing centers",
    'off_assist > 10% && ((posClass == "C") || (posClass == "PF/C" && roster.height >= "6-10")) SORT_BY off_assist',
    "PF/C,C",
  ],
  [
    "Defensive-minded centers",
    "off_usage <= 15% && off_rtg > 105 && def_adj_rapm < -1",
    "C",
  ],

  ["Tall ball-handlers", 'roster.height >= "6-6"', "BH*"],
  [
    "Tall wings",
    '(roster.height >= "6-9") || (roster.height >= "6-8" && posClass == "WG")',
    "WG,WF",
  ],
] as Array<[string, string, string]>;

/** When showing across multiple data sets, don't show intra-year rankings unless it's a full data set */
const fullDataSetSeasons = new Set(DateUtils.coreYears);

/** This would ideally live in AdvancedFilterUtils but that is currently ts */
const playerLeaderboardRichTextReplacements: Record<
  string,
  { renderTo: ReactNode }
> = {
  hs_region_dmv: {
    renderTo: (
      <Badge variant="info">
        <div style={{ fontSize: "0.95rem" }}>hs_region_dmv</div>
      </Badge>
    ),
  },
};

// Functional component

const PlayerLeaderboardTable: React.FunctionComponent<Props> = ({
  startingState,
  dataEvent,
  onChangeState,
  teamEditorMode,
  geoMode,
  testMode,
}) => {
  const server =
    typeof window === `undefined` //(ensures SSR code still compiles)
      ? "server"
      : window.location.hostname;

  /** Only show help for diagnstic on/off on main page */
  const showHelp = !_.startsWith(server, "cbb-on-off-analyzer");

  const { theme } = useTheme();

  /** Just for posting a link that loads the page with the presets open for publicity :) */
  const showPresetsOnLoad =
    typeof window === `undefined`
      ? false
      : window.location.search.indexOf("&showPresets") >= 0;

  // 1] Data Model

  const [clipboard, setClipboard] = useState(null as null | ClipboardJS);

  // 2] State

  // Data source
  const [confs, setConfs] = useState(startingState.conf || "");
  const [yearUnreliable, setYear] = useState(
    startingState.year || DateUtils.mostRecentYearWithLboardData
  );
  const year = startingState.year || DateUtils.mostRecentYearWithLboardData;
  //(changing year changes data which triggers a reload of this page, so startingState is always right ...
  // whereas conversely if year is changed programmatically from outside the page, yearUnreliable won't change)
  const [genderUnreliable, setGender] = useState(
    startingState.gender || ParamDefaults.defaultGender
  );
  const gender = startingState.gender || ParamDefaults.defaultGender;
  //(see year/yearUnreliable, this is the same thing)

  // (use startingState.year because this can be set programmatically from parents)
  const isMultiYr = teamEditorMode
    ? startingState.year == DateUtils.AllYears
    : startingState.year == DateUtils.ExtraYears ||
      startingState.year == DateUtils.AllYears;

  const [tier, setTier] = useState(
    startingState.tier || ParamDefaults.defaultTier
  );

  // Misc display

  const [posClasses, setPosClasses] = useState(startingState.posClasses || "");

  /** Whether to show sub-header with extra info */
  const [showInfoSubHeader, setShowInfoSubHeader] = useState(
    startingState.showInfoSubHeader || false
  );

  const [showRepeatingHeader, setShowRepeatingHeader] = useState(
    true as boolean
  ); //(always defaults to on)

  /** Whether to make the quick toggle bar stick (default: on) */
  const [stickyQuickToggle, setStickyQuickToggle] = useState(
    _.isNil(startingState.stickyQuickToggle)
      ? true
      : startingState.stickyQuickToggle
  );

  /** Show the number of possessions as a % of total team count */
  const [factorMins, setFactorMins] = useState(
    _.isNil(startingState.factorMins)
      ? ParamDefaults.defaultPlayerLboardFactorMins
      : startingState.factorMins
  );
  const [useRapm, setUseRapm] = useState(
    _.isNil(startingState.useRapm)
      ? ParamDefaults.defaultPlayerLboardUseRapm
      : startingState.useRapm
  );

  /** Show team and individual grades */
  const [showGrades, setShowGrades] = useState(
    _.isNil(startingState.showGrades) ? "" : startingState.showGrades
  );

  /** Show simplified player shot chart */
  const [showPlayerShots, setShowPlayerShots] = useState(
    _.isNil(startingState.shotCharts) ? false : startingState.shotCharts
  );

  /** Show simplified player play style breakdown */
  const [showPlayerPlayTypes, setShowPlayerPlayTypes] = useState(
    _.isNil(startingState.showPlayerPlayTypes)
      ? false
      : startingState.showPlayerPlayTypes
  );

  /** Set this to be true on expensive operations */
  const [loadingOverride, setLoadingOverride] = useState(false);
  const [geoLoadingOverride, setGeoLoadingOverride] = useState(false);

  const startingMinPoss =
    startingState.minPoss || ParamDefaults.defaultPlayerLboardMinPos;
  const [minPoss, setMinPoss] = useState(startingMinPoss);
  const startingMaxTableSize =
    startingState.maxTableSize ||
    (geoMode
      ? ParamDefaults.defaultPlayerLboardGeoMaxTableSize
      : ParamDefaults.defaultPlayerLboardMaxTableSize);
  const [maxTableSize, setMaxTableSize] = useState(startingMaxTableSize);
  const [sortBy, setSortBy] = useState(
    startingState.sortBy ||
      ParamDefaults.defaultPlayerLboardSortBy(useRapm, factorMins)
  );
  const [filterStr, setFilterStr] = useState(
    PlayerLeaderboardTracking[startingState.filter || ""] ||
      startingState.filter ||
      ParamDefaults.defaultPlayerLboardFilter
  );
  const [numFilteredStr, setNumFilteredStr] = useState("" as string);

  const [advancedFilterStr, setAdvancedFilterStr] = useState(
    startingState.advancedFilter || ""
  );
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false); //(|| with advancedFilterStr.length > 0)
  const [advancedFilterError, setAdvancedFilterError] = useState(
    undefined as string | undefined
  );
  const [exampleForFilterStr, setExampleForFilterStr] = useState(
    undefined as undefined | IndivStatSet
  );

  const [isT100, setIsT100] = useState(startingState.t100 || false);
  const [isConfOnly, setIsConfOnly] = useState(startingState.confOnly || false);
  const [incLowVol, setIncLowVol] = useState(startingState.incLowVol || false);

  const [showExpanded, setShowExpanded] = useState(
    _.isNil(startingState.showExpanded)
      ? !FeatureFlags.isActiveWindow(FeatureFlags.expandedPlayerLeaderboard)
      : startingState.showExpanded
  );

  // Geo filtering
  const [geoBoundsChecker, setGeoBoundsChecker] = useState<
    ((lat: number, lon: number) => boolean) | undefined
  >(undefined);
  const [geoCenterInfo, setGeoCenterInfo] = useState<{
    lat: number | undefined;
    lon: number | undefined;
    zoom: number | undefined;
  }>({
    lat: startingState.geoCenterLat
      ? parseFloat(startingState.geoCenterLat)
      : undefined,
    lon: startingState.geoCenterLon
      ? parseFloat(startingState.geoCenterLon)
      : undefined,
    zoom: startingState.geoZoom ? parseInt(startingState.geoZoom) : undefined,
  });

  /** If enabled we show a prediction for next year for the player */
  const transferInfoSplit = (
    startingState.transferMode?.toString() || ""
  ).split(":");
  const transferPredictionMode = transferInfoSplit[1] == "predictions"; //(don't filter on transfers but do show predictions)

  /** Show the number of possessions as a % of total team count */
  const [possAsPct, setPossAsPct] = useState(
    _.isNil(startingState.possAsPct)
      ? ParamDefaults.defaultPlayerLboardPossAsPct
      : startingState.possAsPct
  );

  /** When switching between rating and prod, also switch common sort bys over */
  const toggleFactorMins = () => {
    const newSortBy = factorMins
      ? sortBy.replace("_rapm_prod", "_rapm").replace("_prod", "_rtg")
      : sortBy.replace("_rapm", "_rapm_prod").replace("_rtg", "_prod");
    if (newSortBy != sortBy && !_.endsWith(sortBy, "_pred")) {
      setSortBy(newSortBy);
    }
    setFactorMins(!factorMins);
  };
  /** When switching between RAPM and rtg, also switch common sort bys over */
  const toggleUseRapm = () => {
    const newSortBy = useRapm
      ? sortBy.replace("_rapm_prod", "_prod").replace("_rapm", "_rtg")
      : sortBy.replace("_rtg", "_rapm").replace("adj_prod", "adj_rapm_prod");
    if (newSortBy != sortBy) {
      setSortBy(newSortBy);
    }
    setUseRapm(!useRapm);
  };
  /** Put these options at the front */
  const mostUsefulSubset = factorMins
    ? [
        "desc:diff_adj_prod",
        "desc:diff_adj_rapm_prod",
        "desc:off_adj_prod",
        "desc:off_adj_rapm_prod",
        "asc:def_adj_prod",
        "asc:def_adj_rapm_prod",
      ]
    : [
        "desc:diff_adj_rtg",
        "desc:diff_adj_rapm",
        "desc:off_adj_rtg",
        "desc:off_adj_rapm",
        "asc:def_adj_rtg",
        "asc:def_adj_rapm",
      ];
  const transferPredictionSorters = {
    "desc:diff_adj_rapm_pred": {
      label: "Predicted RAPM margin",
      value: "desc:diff_adj_rapm_pred",
    },
    "desc:off_adj_rapm_pred": {
      label: "Predicted RAPM offense",
      value: "desc:off_adj_rapm_pred",
    },
    "asc:def_adj_rapm_pred": {
      label: "Predicted RAPM defense",
      value: "desc:def_adj_rapm_pred",
    },
  } as Record<string, any>;
  /** The two sub-headers for the dropdown */
  const groupedOptions = [
    {
      label: "Most useful",
      options: (transferPredictionMode
        ? _.values(transferPredictionSorters)
        : []
      ).concat(
        _.chain(sortOptionsByValue)
          .pick(mostUsefulSubset)
          .values()
          .value()
          .concat(startingState.year == DateUtils.AllYears ? [yearOpt] : [])
      ),
    },
    {
      label: "Other",
      options: _.chain(sortOptionsByValue)
        .omit(mostUsefulSubset)
        .values()
        .value(),
    },
  ];

  /** Keyboard listener - handles global page overrides while supporting individual components */
  const submitListenerFactory = (inAutoSuggest: boolean) => (event: any) => {
    const allowKeypress = () => {
      //(if this logic is run inside AutoSuggestText, we've already processed the special cases so carry on)
      return inAutoSuggest || notFromFilterAutoSuggest(event);
    };
    if (
      event.code === "Enter" ||
      event.code === "NumpadEnter" ||
      event.keyCode == 13 ||
      event.keyCode == 14
    ) {
      if (event && event.preventDefault) {
        event.preventDefault();
      }
    } else if (event.code == "Escape" || event.keyCode == 27) {
      if (allowKeypress()) {
        document.body.click(); //closes any overlays (like history) that have rootClick
      }
    }
  };

  useEffect(() => {
    // Add and remove clipboard listener
    initClipboard();

    const submitListener = submitListenerFactory(false);

    // Add "enter" to submit page (do on every effect, since removal occurs on every effect, see return below)
    if (typeof document !== `undefined`) {
      //(TODO: this actually causes mass complications with AutoSuggestText - see the useContext grovelling
      // 'cos for some reason preventDefault from AutoSuggestText gets ignored ... needs more investigation
      // but the grovelling works fine for now!)
      document.addEventListener("keydown", submitListener);
    }

    if (typeof document !== `undefined`) {
      //(if we added a clipboard listener, then remove it on page close)
      //(if we added a submitListener, then remove it on page close)
      return () => {
        if (clipboard) {
          clipboard.destroy();
          setClipboard(null);
        }
        document.removeEventListener("keydown", submitListener);
      };
    }
  });

  useEffect(() => {
    //(this ensures that the filter component is up to date with the union of these fields)
    const newState = {
      ...startingState,
      // These 2 can be changed by parents, in which case they can't be changed from this page
      gender: dataEvent.syntheticData ? startingState.gender : genderUnreliable,
      year: dataEvent.syntheticData ? startingState.year : yearUnreliable,
      // Normal params
      conf: confs,
      tier: tier,
      t100: isT100,
      incLowVol,
      confOnly: isConfOnly,
      // Player filters/settings:
      posClasses: posClasses,
      possAsPct: possAsPct,
      factorMins: factorMins,
      useRapm: useRapm,
      showGrades: showGrades,
      // Misc filters
      minPoss: minPoss,
      maxTableSize: maxTableSize,
      sortBy: sortBy,
      filter: filterStr,
      advancedFilter: advancedFilterStr,
      // Misc display
      showInfoSubHeader: showInfoSubHeader,
      // Geo info:
      geoCenterLat: geoCenterInfo?.lat?.toString(),
      geoCenterLon: geoCenterInfo?.lon?.toString(),
      geoZoom: geoCenterInfo?.zoom?.toString(),
      stickyQuickToggle,
      shotCharts: showPlayerShots,
      showPlayerPlayTypes,
    };
    onChangeState(newState);
  }, [
    minPoss,
    maxTableSize,
    sortBy,
    filterStr,
    advancedFilterStr,
    isT100,
    isConfOnly,
    incLowVol,
    possAsPct,
    factorMins,
    showInfoSubHeader,
    useRapm,
    showGrades,
    posClasses,
    confs,
    yearUnreliable,
    genderUnreliable,
    tier,
    geoCenterInfo,
    stickyQuickToggle,
    showPlayerShots,
    showPlayerPlayTypes,
  ]);

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
    if (
      showGrades ||
      transferPredictionMode ||
      showPlayerPlayTypes ||
      advancedFilterStr.includes("rank_") ||
      advancedFilterStr.includes("pctile_")
    ) {
      //(if transferPredictionMode we'd like some grades so we can show the ranks associated with predicted grades)

      const yearsToCheck = _.thru(
        startingState.includePrevYear,
        (includePrevYear) => {
          if (year == DateUtils.AllYears) {
            return DateUtils.coreYears;
          } else if (includePrevYear) {
            return [DateUtils.getPrevYear(year), year];
          } else {
            return [year];
          }
        }
      );
      yearsToCheck.forEach((yearToCheck) => {
        const currCacheForThisYear = divisionStatsCache[yearToCheck] || {};
        const currPosCacheForThisYear = positionalStatsCache[yearToCheck] || {};
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
        if (_.isEmpty(currTeamCacheForThisYear) || yearOrGenderChanged) {
          if (
            advancedFilterStr.includes("rank_team_stats") ||
            advancedFilterStr.includes("pctile_team_stats")
          ) {
            if (!_.isEmpty(currTeamCacheForThisYear)) {
              setTeamDivisionStatsCache((currCache) => ({
                ...currCache,
                [yearToCheck]: {},
              })); //unset if set
            }
            GradeTableUtils.populateTeamDivisionStatsCache(
              { year: yearToCheck, gender },
              (newCache) => {
                setTeamDivisionStatsCache((currCache) => ({
                  ...currCache,
                  [yearToCheck]: newCache,
                }));
                setDivisionStatsRefresh((curr) => curr + 1);
              }
            );
          }
        }

        if (showGrades) {
          //(these are no use if we're just predicted transfer performance)
          const maybePosGroup = showGrades.split(":")[2]; //(rank[:tier[:pos]])
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
  }, [year, gender, showGrades, showPlayerPlayTypes]);

  // 3] Utils

  // 3.1] Build individual info

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

  // 3.2] Table building

  const offPrefixFn = (key: string) => "off_" + key;
  const offCellMetaFn = (key: string, val: any) => "off";
  const defPrefixFn = (key: string) => "def_" + key;
  const defCellMetaFn = (key: string, val: any) => "def";

  /** Used in table building below but also to display example in tooltip */
  const buildFilterStringTest = (player: IndivStatSet) => {
    const names = (player.key || "").split(" ");
    const firstName = names ? names[names.length - 1] : ""; //(allows eg MiMitchell+Makhi)
    const usefulFormatBuilder = (s: string) => {
      return `${player.roster?.year_class || ""}_${s || ""}:${
        player.team || ""
      }_${player.year || ""}`;
    };
    return `${player.key || ""}:${usefulFormatBuilder(
      `${player.code || ""}+${firstName}`
    )} ${usefulFormatBuilder(player.code || "")}`;
  };

  /** Builds a list of JSON objects with basic filtering, subsequent phases render */
  const phase1Processing = (
    dataEventPlayers: any[],
    applyMiscFilters: boolean = true
  ): { playersPhase1: any[]; isFiltered: boolean | undefined } => {
    const specialCases = {
      P6: Power6Conferences,
      MM: NonP6Conferences,
    } as Record<string, any>;

    const confSet = confs
      ? new Set(
          _.flatMap(
            (confs || "").split(","),
            (c) => specialCases[c] || [NicknameToConference[c] || c]
          )
        )
      : undefined;

    const posClassSet = posClasses
      ? new Set(
          _.flatMap(
            (posClasses || "").split(","),
            (c) => PositionUtils.expandedPosClasses[c] || [c]
          )
        )
      : undefined;

    //TODO: make this a % or an int?
    // Filter and limit players part 1/2
    const minPossNum = parseInt(minPoss) || 0;
    const confDataEventPlayers = applyMiscFilters
      ? dataEventPlayers.filter((player) => {
          return (
            ((!confSet || confSet.has(player.conf || "Unknown")) &&
              (!posClassSet || posClassSet.has(player.posClass || "Unknown")) &&
              player.off_team_poss?.value >= minPossNum) ||
            minPossNum == 0
          );
          //(we do the "spurious" minPossNum check so we can detect filter presence and use to add a ranking)
        })
      : dataEventPlayers;

    /** These hacks aren't too unpleasant since they are only used within this fn and for display */
    var varNoGeoFilters = true;

    const skipSort =
      (year != DateUtils.AllYears &&
        tier != "All" &&
        sortBy ==
          ParamDefaults.defaultPlayerLboardSortBy(
            ParamDefaults.defaultPlayerLboardUseRapm,
            ParamDefaults.defaultPlayerLboardFactorMins
          )) ||
      sortBy == unsortedOpt.value;
    // Filter, sort, and limit players part 2/2
    const playersPhase1 =
      geoMode && !geoBoundsChecker // In geo mode, don't render until we have a map!
        ? []
        : _.chain(confDataEventPlayers)
            .filter((player, playerIndex) => {
              const strToTestCase = buildFilterStringTest(player);
              const strToTest = caseInsensitiveSearch
                ? strToTestCase.toLowerCase()
                : strToTestCase;

              const maybeTxfer = _.find(
                dataEvent?.transfers?.[player.code] || [],
                (comp) => comp.f == player.team
              );
              if (maybeTxfer?.f) player.transfer_src = maybeTxfer?.f;
              if (maybeTxfer?.t) player.transfer_dest = maybeTxfer?.t;

              if (transferPredictionMode) {
                const genderYearLookup = `${gender}_${player.year}`;
                const avgEfficiency =
                  efficiencyAverages[genderYearLookup] ||
                  efficiencyAverages.fallback;

                const prediction = TeamEditorUtils.approxTransferPrediction(
                  player,
                  player.transfer_dest,
                  player.year,
                  avgEfficiency
                );
                player.off_adj_rapm_pred = prediction.off_adj_rapm;
                player.def_adj_rapm_pred = prediction.def_adj_rapm;
                player.off_rtg_pred = prediction.off_rtg;
                player.off_usage_pred = prediction.off_usage;
              }

              const playerHasLatLong =
                player?.roster &&
                _.isNumber(player?.roster?.lat) &&
                _.isNumber(player?.roster?.lon);
              const geoMatch = _.isFunction(geoBoundsChecker)
                ? playerHasLatLong
                  ? geoBoundsChecker(player.roster.lat, player.roster.lon)
                  : false
                : true;

              /** Keep track of this for display purposes */
              varNoGeoFilters =
                varNoGeoFilters && (!playerHasLatLong || geoMatch);

              const isMatch =
                geoMatch &&
                (_.isEmpty(transferInfoSplit[0]) ||
                  _.isEmpty(dataEvent.transfers) || //(if not specified, don't care about transfers)
                  (maybeTxfer &&
                    (!maybeTxfer.t || transferInfoSplit[0] != "true"))) &&
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
              if (isMatch && !_.isNil(dataEvent?.teams)) {
                // Add team info:
                player.team_stats =
                  dataEvent.teams[`${player.team}_${player.year || year}`] ||
                  {};
              }
              return isMatch || !applyMiscFilters;
            })
            .sortBy(
              skipSort
                ? [] //(can save on a sort if using the generated sort-order, or if sorting is disabled)
                : [
                    LineupTableUtils.sorter(sortBy),
                    (p) => p.baseline?.off_team_poss?.value || 0,
                    (p) => p.key,
                  ]
            )
            .value();

    const isFiltered =
      (advancedFilterStr.length > 0 && !advancedFilterError) ||
      confDataEventPlayers.length < dataEventPlayers.length ||
      (filterStr || "") != "" ||
      posClasses != "" ||
      (geoMode && !varNoGeoFilters);

    return { playersPhase1, isFiltered };
  };

  /** Export teams to string */
  const buildExportStr = (filtered: boolean): string => {
    const { playersPhase1, isFiltered } = phase1Processing(
      dataEvent?.players || [],
      filtered
    );

    const [players, tmpAvancedFilterError] =
      advancedFilterStr.length > 0 && filtered
        ? AdvancedFilterUtils.applyPlayerFilter(
            playersPhase1,
            advancedFilterStr,
            (year: string) =>
              GradeTableUtils.pickDivisonStats(
                divisionStatsCache, //TODO does this want to be the pos cache at some point?
                year,
                gender,
                showGrades
              ),
            (year: string) =>
              GradeTableUtils.pickDivisonStats(
                teamDivisionStatsCache,
                year,
                gender,
                showGrades
              )
          )
        : [playersPhase1, undefined];

    const [header, dataRows] = AdvancedFilterUtils.generatePlayerLeaderboardCsv(
      advancedFilterStr,
      players,
      startingState.includePrevYear || false, //(if true we want to export both available seasons)
      showGrades
        ? (year: string) =>
            GradeTableUtils.pickDivisonStats(
              divisionStatsCache,
              year,
              gender,
              showGrades
            )
        : undefined,
      (
        year: string //(we only use this to inject team stats explicitly mentioned so ignore whether grades are enabled)
      ) =>
        GradeTableUtils.pickDivisonStats(
          teamDivisionStatsCache,
          year,
          gender,
          showGrades
        )
    );

    return [header].concat(dataRows).join("\n");
  };

  /** Only rebuild the expensive table if one of the parameters that controls it changes */
  const { table, maybeMap } = React.useMemo(() => {
    setLoadingOverride(false); //(rendering)
    setGeoLoadingOverride(false); //(rendering)

    // Marshalling of player object

    const { playersPhase1, isFiltered } = phase1Processing(
      dataEvent?.players || [],
      true
    );

    const [players, tmpAvancedFilterError] =
      advancedFilterStr.length > 0
        ? AdvancedFilterUtils.applyPlayerFilter(
            playersPhase1,
            advancedFilterStr,
            (year: string) =>
              GradeTableUtils.pickDivisonStats(
                divisionStatsCache, //TODO does this want to be the pos cache at some point?
                year,
                gender,
                showGrades
              ),
            (year: string) =>
              GradeTableUtils.pickDivisonStats(
                teamDivisionStatsCache,
                year,
                gender,
                showGrades
              )
          )
        : [playersPhase1, undefined];

    if (advancedFilterStr.length > 0)
      setAdvancedFilterError(tmpAvancedFilterError);

    // Rendering:

    const usefulSortCombo = useRapm
      ? factorMins
        ? sortBy != "desc:diff_adj_rapm_prod" &&
          sortBy != "desc:off_adj_rapm_prod" &&
          sortBy != "asc:def_adj_rapm_prod"
        : sortBy != "desc:diff_adj_rapm" &&
          sortBy != "desc:off_adj_rapm" &&
          sortBy != "asc:def_adj_rapm"
      : factorMins
      ? sortBy != "desc:diff_adj_prod" &&
        sortBy != "desc:off_adj_prod" &&
        sortBy != "asc:def_adj_prod"
      : sortBy != "desc:diff_adj_rtg" &&
        sortBy != "desc:off_adj_rtg" &&
        sortBy != "asc:def_adj_rtg";

    /** Either the sort is not one of the 3 pre-calced, or there is a filter */
    const isGeneralSortOrFilter =
      usefulSortCombo ||
      !_.isNil(dataEvent.transfers) ||
      isFiltered ||
      year == DateUtils.AllYears;

    /** Compresses number/height/year into 1 double-width column */
    const rosterInfoSpanCalculator = (key: string) =>
      key == "efg" ? 2 : key == "assist" ? 0 : 1;

    const numFiltered = _.size(players);

    var playerDuplicates = 0; //(annoying hack to keep track of playerIndex vs actual row)
    const builderPlayerLine = (
      player: any,
      playerIndex: number,
      nextYearState: "y1ofN" | "y1of1" | "y2of2"
    ) => {
      if (playerIndex == 0) setExampleForFilterStr(player);
      const firstRowForPlayer = nextYearState != "y2of2";
      const lastRowForPlayer = nextYearState != "y1ofN";

      const divisionStatesCacheByYear: DivisionStatsCache =
        divisionStatsCache[player.year || year] || {};

      const isDup =
        tier == "All" &&
        playerIndex > 0 &&
        firstRowForPlayer &&
        players[playerIndex - 1].key == player.key &&
        players[playerIndex - 1].team == player.team &&
        players[playerIndex - 1].year == player.year;

      if (isDup) playerDuplicates++;

      const posBreakdown =
        _.size(player.posFreqs) >= 5
          ? _.flatMap(["PG", "SG", "SF", "PF", "C"], (pos, index) => {
              const freqOfPos = (player.posFreqs[index] || 0) * 100;
              return freqOfPos >= 10
                ? [`${pos}: ${freqOfPos.toFixed(0)}%`]
                : [];
            }).join(", ")
          : undefined;

      const withNonBreakingHyphen = (s: string) => {
        return <span style={{ whiteSpace: "nowrap" }}>{s}</span>;
      };

      player.def_usage = (
        <OverlayTrigger
          placement="auto"
          overlay={TableDisplayUtils.buildPositionTooltip(
            player.posClass,
            "season",
            true,
            posBreakdown
          )}
        >
          <small>
            {withNonBreakingHyphen(player.posClass)}
            {posBreakdown ? <sup>*</sup> : undefined}
          </small>
        </OverlayTrigger>
      );

      const confNickname = ConferenceToNickname[player.conf] || "???";
      const teamSeasonLookup = `${startingState.gender}_${player.team}_${startingState.year}`;

      const generalRank =
        !isDup && isGeneralSortOrFilter && firstRowForPlayer ? (
          <span>
            <i>(#{playerIndex + 1 - playerDuplicates})</i>&nbsp;
          </span>
        ) : null;

      const rankingsTooltip = (
        <Tooltip id={`rankings_${playerIndex}_${nextYearState}`}>
          {factorMins ? "Production " : "Rating "}Ranks:
          <br />
          {isGeneralSortOrFilter ? "[filtered/sorted subset] " : ""}
          {isGeneralSortOrFilter ? <br /> : null}
          {player.tier ? `${player.tier} Tier` : null}
          {player.tier ? <br /> : null}[
          {useRapm ? "Net RAPM" : "Adj Net Rating+"}]<br />[
          {useRapm ? "Offensive RAPM" : "Adj Offensive Rating+"}]<br />[
          {useRapm ? "Defensive RAPM" : "Adj Defensive Rating+"}]
        </Tooltip>
      );

      const getRankings = () => {
        const rtg = useRapm
          ? factorMins
            ? "rapm_prod"
            : "rapm"
          : factorMins
          ? "prod"
          : "rtg";

        const marginRank =
          sortBy == `desc:diff_adj_${rtg}` ? (
            <b>
              <big>#{player[`adj_${rtg}_margin_rank`]}</big>
            </b>
          ) : (
            `#${player[`adj_${rtg}_margin_rank`]}`
          );
        const offRank =
          sortBy == `desc:off_adj_${rtg}` ? (
            <b>
              <big>#{player[`off_adj_${rtg}_rank`]}</big>
            </b>
          ) : (
            `#${player[`off_adj_${rtg}_rank`]}`
          );
        const defRank =
          sortBy == `asc:def_adj_${rtg}` ? (
            <b>
              <big>#{player[`def_adj_${rtg}_rank`]}</big>
            </b>
          ) : (
            `#${player[`def_adj_${rtg}_rank`]}`
          );
        return (year == "All" && !fullDataSetSeasons.has(player.year)) ||
          _.isUndefined(player.off_adj_rtg_rank) ? (
          <OverlayTrigger placement="auto" overlay={rankingsTooltip}>
            <span>
              {generalRank}
              <small>(no ranking)</small>
            </span>
          </OverlayTrigger>
        ) : (
          <OverlayTrigger placement="auto" overlay={rankingsTooltip}>
            <span>
              {generalRank}
              <small>
                {player.tier ? <b>{player.tier.substring(0, 1)}</b> : ""}
                {marginRank} ({offRank} / {defRank})
              </small>
            </span>
          </OverlayTrigger>
        );
      };
      const rankings = getRankings();

      const playerLboardTooltip = (
        <Tooltip id={`lboard_${playerIndex}_${nextYearState}`}>
          {player.roster?.origin ? (
            <span>
              {player.roster?.origin}
              <br />
              <br />
            </span>
          ) : null}
          Open new tab showing all the player's seasons, in the multi-year
          version of the leaderboard
        </Tooltip>
      );
      const playerTeamEditorTooltip = (
        <Tooltip id={`lboard_teamEditor_${playerIndex}_${nextYearState}`}>
          Add this player to the Team Builder table
        </Tooltip>
      );
      const playerLeaderboardParams = {
        tier: "All",
        year: DateUtils.AllYears,
        filter: `${player.key}:;`,
        sortBy: "desc:year",
        showInfoSubHeader: true,
      };
      const playerEl = teamEditorMode ? (
        <OverlayTrigger placement="auto" overlay={playerTeamEditorTooltip}>
          <a
            target="_blank"
            href="#"
            style={{ wordWrap: "normal" }}
            onClick={(ev) => {
              teamEditorMode(player);
              ev.preventDefault();
            }}
          >
            {player.key}
          </a>
        </OverlayTrigger>
      ) : (
        <OverlayTrigger placement="auto" overlay={playerLboardTooltip}>
          <a
            target="_blank"
            style={{ wordWrap: "normal" }}
            href={UrlRouting.getPlayerLeaderboardUrl(playerLeaderboardParams)}
          >
            {firstRowForPlayer
              ? player.key
              : `${_.split(player.key, ",")[0]}${
                  isMultiYr ? `` : ` '${player.year?.substring(2, 4) || "??"}`
                }`}
          </a>
        </OverlayTrigger>
      );

      const teamTooltip = (
        <Tooltip id={`team_${playerIndex}_${nextYearState}`}>
          Open new tab with a detailed analysis view (roster, play style info,
          on/off) for this player/team
        </Tooltip>
      );
      const teamParams = {
        team: player.team,
        gender: gender,
        year: player.year || year,
        minRank: "0",
        maxRank: isT100 ? "100" : "400",
        queryFilters: isConfOnly ? "Conf" : undefined,
        factorMins: factorMins,
        possAsPct: possAsPct,
        showExpanded: true,
        calcRapm: true,
        showTeamPlayTypes: !isT100 && !isConfOnly,
        showGrades: "rank:Combo",
        showExtraInfo: true,
        showRoster: true,
      };
      const teamEl = teamEditorMode ? (
        <span>{player.team}</span>
      ) : (
        <OverlayTrigger placement="auto" overlay={teamTooltip}>
          <a target="_blank" href={UrlRouting.getGameUrl(teamParams, {})}>
            {player.team}
          </a>
        </OverlayTrigger>
      );

      const playerAnalysisParams = {
        team: player.team,
        gender: gender,
        year: player.year || year,
        minRank: "0",
        maxRank: isT100 ? "100" : "400",
        queryFilters: isConfOnly ? "Conf" : undefined,
        factorMins: factorMins,
        possAsPct: possAsPct,
        showExpanded: true,
        showDiag: true,
        showPosDiag: true,
        filter: player.code || player.key,
      };
      const rapmAnalysisParams = {
        team: player.team,
        gender: gender,
        year: player.year || year,
        minRank: "0",
        maxRank: isT100 ? "100" : "400",
        filter: player.code || player.key,
        //TODO: heh need to add queryFilters to lineup and team report query box
        showOnOff: false,
        showComps: false,
        incRapm: true,
        teamLuck: true,
        rapmDiagMode: "base",
      };
      const rapmTooltip = (
        <Tooltip id={`rapm_${playerIndex}_${nextYearState}`}>
          RAPM {factorMins ? "Production" : "Rating"} margin: click to open new
          tab showing the RAPM diagnostics for this player
        </Tooltip>
      );
      const playerTooltip = (
        <Tooltip id={`player_${playerIndex}_${nextYearState}`}>
          {factorMins ? "Production" : "Rating"} margin: click to open new tab
          showing the off/def rating diagnostics for this player
        </Tooltip>
      );

      const adjMargin = useRapm
        ? factorMins
          ? (player.off_adj_rapm_prod?.value || 0) -
            (player.def_adj_rapm_prod?.value || 0)
          : (player.off_adj_rapm?.value || 0) -
            (player.def_adj_rapm?.value || 0)
        : factorMins
        ? (player.off_adj_prod?.value || 0) - (player.def_adj_prod?.value || 0)
        : (player.off_adj_rtg?.value || 0) - (player.def_adj_rtg?.value || 0);
      const adjMarginStr = teamEditorMode ? (
        <b>{`${adjMargin > 0.0 ? "+" : ""}${adjMargin.toFixed(1)}`}</b>
      ) : (
        <OverlayTrigger
          placement="auto"
          overlay={useRapm ? rapmTooltip : playerTooltip}
        >
          <a
            target="_blank"
            href={
              useRapm
                ? UrlRouting.getTeamReportUrl(rapmAnalysisParams)
                : UrlRouting.getGameUrl(playerAnalysisParams, {})
            }
          >
            <b>{`${adjMargin > 0.0 ? "+" : ""}${adjMargin.toFixed(1)}`}</b>
          </a>
        </OverlayTrigger>
      );

      const maybeYrStr = isMultiYr
        ? ` '${player.year?.substring(2, 4) || "??"}+`
        : ``;

      // Add roster metadata:

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

      // Transfer info

      const txfeEl = player.transfer_dest ? (
        <span> (&gt;{player.transfer_dest})</span>
      ) : null;

      const predictionLine = _.thru(transferPredictionMode, (__) => {
        if (transferPredictionMode) {
          const offPred = player.off_adj_rapm_pred?.value || 0;
          const defPred = player.def_adj_rapm_pred?.value || 0;
          const netPred = offPred - defPred;
          const offRtgPred = player.off_rtg_pred?.value || 100;
          const offUsagePred = (player.off_usage_pred?.value || 0.2) * 100;
          const netPredWithShadow = (
            <b
              style={CommonTableDefs.getTextShadow(
                { value: netPred },
                CbbColors.diff10_p100_redGreen[0],
                "15px",
                6
              )}
            >
              {netPred.toFixed(1)}
            </b>
          );
          const offPredWithShadow = (
            <b
              style={CommonTableDefs.getTextShadow(
                { value: offPred },
                CbbColors.diff10_p100_redGreen[0],
                "15px",
                6
              )}
            >
              {offPred.toFixed(1)}
            </b>
          );
          const defPredWithShadow = (
            <b
              style={CommonTableDefs.getTextShadow(
                { value: defPred },
                CbbColors.diff10_p100_redGreen[1],
                "15px",
                6
              )}
            >
              {defPred.toFixed(1)}
            </b>
          );
          const offRtgWithShadow = (
            <b
              style={CommonTableDefs.getTextShadow(
                { value: offRtgPred },
                CbbColors.pp100[0],
                "15px",
                6
              )}
            >
              {offRtgPred.toFixed(1)}
            </b>
          );
          const usageWithShadow = (
            <b
              style={CommonTableDefs.getTextShadow(
                { value: offUsagePred * 0.01 },
                CbbColors.usg[0],
                "15px",
                6
              )}
            >
              {offUsagePred.toFixed(1)}
            </b>
          );

          // Enrich with grade info
          const { netGrade, offGrade, defGrade, offRtgGrade, usageGrade } =
            _.thru(showGrades, (__) => {
              if (playerIndex < 50) {
                //(since it can be slightly slow)
                const statsToGrade = {
                  off_adj_rapm: player.off_adj_rapm_pred,
                  def_adj_rapm: player.def_adj_rapm_pred,
                  off_adj_rapm_margin: { value: netPred },
                  off_rtg: player.off_rtg_pred,
                  off_usage: player.off_usage_pred,
                };

                const { tierToUse, gradeFormat, ...unused } =
                  GradeTableUtils.buildPlayerTierInfo(
                    showGrades || "rank:Combo",
                    {
                      comboTier: divisionStatesCacheByYear.Combo,
                      highTier: divisionStatesCacheByYear.High,
                      mediumTier: divisionStatesCacheByYear.Medium,
                      lowTier: divisionStatesCacheByYear.Low,
                    },
                    positionalStatsCache[player.year || year] || {}
                  );

                const predictedGrades = tierToUse
                  ? GradeUtils.buildPlayerPercentiles(
                      tierToUse,
                      statsToGrade,
                      _.keys(statsToGrade),
                      gradeFormat == "rank"
                    )
                  : {};

                const netGradeEl = predictedGrades.off_adj_rapm_margin ? (
                  <small>
                    &nbsp;(
                    {GradeTableUtils.buildPlayerGradeTextElement(
                      predictedGrades.off_adj_rapm_margin,
                      gradeFormat,
                      CbbColors.off_pctile_qual
                    )}
                    )
                  </small>
                ) : undefined;

                const offGradeEl = predictedGrades.off_adj_rapm ? (
                  <small>
                    &nbsp;(
                    {GradeTableUtils.buildPlayerGradeTextElement(
                      predictedGrades.off_adj_rapm,
                      gradeFormat,
                      CbbColors.off_pctile_qual
                    )}
                    )
                  </small>
                ) : undefined;

                const defGradeEl = predictedGrades.def_adj_rapm ? (
                  <small>
                    &nbsp;(
                    {GradeTableUtils.buildPlayerGradeTextElement(
                      predictedGrades.def_adj_rapm,
                      gradeFormat,
                      CbbColors.off_pctile_qual
                    )}
                    )
                  </small>
                ) : undefined;

                const offRtgGradeEl = predictedGrades.off_rtg ? (
                  <small>
                    &nbsp;(
                    {GradeTableUtils.buildPlayerGradeTextElement(
                      predictedGrades.off_rtg,
                      gradeFormat,
                      CbbColors.off_pctile_qual
                    )}
                    )
                  </small>
                ) : undefined;

                const usageGradeEl = predictedGrades.off_usage ? (
                  <small>
                    &nbsp;(
                    {GradeTableUtils.buildPlayerGradeTextElement(
                      predictedGrades.off_usage,
                      gradeFormat,
                      CbbColors.all_pctile_freq
                    )}
                    )
                  </small>
                ) : undefined;

                return {
                  netGrade: netGradeEl,
                  offGrade: offGradeEl,
                  defGrade: defGradeEl,
                  offRtgGrade: offRtgGradeEl,
                  usageGrade: usageGradeEl,
                };
              } else {
                return {
                  netGrade: undefined,
                  offGrade: undefined,
                  defGrade: undefined,
                  offRtgGrade: undefined,
                  usageGrade: undefined,
                };
              }
            });

          const smallComp1 = (
            <small>
              <b>Next year's RAPM predictions</b>
            </small>
          );
          const smallComp2 = <small>//</small>;
          const smallComp3 = (
            <small>
              {" "}
              // off rating=[{offRtgWithShadow}]{offRtgGrade} usage=[
              {usageWithShadow}]%{usageGrade}
            </small>
          );
          return (
            <span>
              {smallComp1}: net=[{netPredWithShadow}]{netGrade} {smallComp2}{" "}
              off=[{offPredWithShadow}]{offGrade} def=[{defPredWithShadow}]
              {defGrade}
              {smallComp3}
            </span>
          );
        } else {
          return undefined;
        }
      });

      // Player display

      player.off_title = (
        <div>
          <span className="float-left">{rankings}</span>&nbsp;
          <b>
            {playerEl}
            {maybeYrStr}
          </b>
          <br />
          <span className="float-left">
            <span>
              {teamEl}&nbsp;(<span>{confNickname}</span>)&nbsp;[{adjMarginStr}]
              {txfeEl}
            </span>
          </span>
        </div>
      );

      player.off_drb = player.def_orb; //(just for display, all processing should use def_orb)
      TableDisplayUtils.injectPlayTypeInfo(
        player,
        true,
        true,
        teamSeasonLookup
      );

      const showGradesFactor = _.thru(
        startingState.includePrevYear || false,
        (includePrevYear) => {
          if (includePrevYear) {
            return showGrades ? 1 : 2;
          } else {
            return showGrades ? 2 : 5;
          }
        }
      );
      const shouldInjectSubheader =
        playerIndex > 0 &&
        0 == (playerIndex - playerDuplicates) % showGradesFactor;
      //TODO: this will inject in the wrong place if we are showing prevYear data

      if (showGrades) {
        // Always show the overall grade, even though it's spurious in some cases - it's too hard
        // to figure out when (eg even with totally default view - and there's a bunch of ways the user can add
        // various filters - you still have H/M/L players)

        const adjRapmMargin: Statistic | undefined =
          player.off_adj_rapm && player.def_adj_rapm
            ? {
                value:
                  (player.off_adj_rapm?.value || 0) -
                  (player.def_adj_rapm?.value || 0),
              }
            : undefined;

        if (adjRapmMargin) {
          player.off_adj_rapm_margin = adjRapmMargin;
          player.off_adj_rapm_prod_margin = {
            value: adjRapmMargin.value! * player.off_team_poss_pct.value!,
            override: adjRapmMargin.override,
          };
        }
      } else {
        player.off_adj_rapm_margin = undefined;
        player.off_adj_rapm_prod_margin = undefined;
      }

      return isDup
        ? _.flatten([[GenericTableOps.buildTextRow(rankings, "small")]])
        : _.flatten([
            playerIndex > 0 && firstRowForPlayer
              ? [GenericTableOps.buildRowSeparator()]
              : [],
            shouldInjectSubheader && showRepeatingHeader && firstRowForPlayer
              ? [
                  GenericTableOps.buildHeaderRepeatRow(
                    CommonTableDefs.repeatingOnOffIndivHeaderFields,
                    "small"
                  ),
                  GenericTableOps.buildRowSeparator(),
                ]
              : [],
            [GenericTableOps.buildDataRow(player, offPrefixFn, offCellMetaFn)],
            [
              GenericTableOps.buildDataRow(
                player,
                defPrefixFn,
                defCellMetaFn,
                undefined,
                rosterInfoSpanCalculator
              ),
            ],
            predictionLine
              ? [GenericTableOps.buildTextRow(predictionLine, "")]
              : [],
            showGrades && playerIndex < 50
              ? GradeTableUtils.buildPlayerGradeTableRows({
                  isFullSelection: !isT100 && !isConfOnly,
                  selectionTitle: `Grades`,
                  config: showGrades,
                  setConfig: (newConfig: string) => {
                    friendlyChange(
                      () => setShowGrades(newConfig),
                      newConfig != showGrades
                    );
                  },
                  playerStats: {
                    comboTier: divisionStatesCacheByYear.Combo,
                    highTier: divisionStatesCacheByYear.High,
                    mediumTier: divisionStatesCacheByYear.Medium,
                    lowTier: divisionStatesCacheByYear.Low,
                  },
                  playerPosStats:
                    positionalStatsCache[player.year || year] || {},
                  player,
                  expandedView: true,
                  possAsPct,
                  factorMins,
                  includeRapm: true,
                  leaderboardMode: true,
                })
              : [],
            showPlayerShots &&
            playerIndex < 50 &&
            (player.year || year >= DateUtils.firstYearWithShotChartData) &&
            player.shotInfo
              ? [
                  GenericTableOps.buildTextRow(
                    <ShotZoneChartDiagView
                      gender={gender as "Men" | "Women"}
                      off={player.shotInfo}
                    />,
                    "small"
                  ),
                ]
              : [],
            showPlayerPlayTypes && playerIndex < 50 && player.style
              ? [
                  GenericTableOps.buildTextRow(
                    <IndivPlayTypeDiagRadar
                      title={player.key}
                      player={player}
                      rosterStatsByCode={{}}
                      teamStats={{} as TeamStatSet}
                      avgEfficiency={
                        efficiencyAverages[`${gender}_${player.year}`] ||
                        efficiencyAverages.fallback
                      }
                      quickSwitchOptions={[]}
                      showGrades={showGrades}
                      grades={divisionStatsCache[player.year || year]}
                      showHelp={showHelp}
                      quickSwitchOverride={undefined}
                      compressedPlayTypeStats={player.style}
                      navigationLinkOverride={
                        <OverlayTrigger
                          placement="auto"
                          overlay={
                            <Tooltip id={`${player.code}styleTeamView`}>
                              Open the Team view with the play style chart
                              showing this player's actions in a team context
                            </Tooltip>
                          }
                        >
                          <a
                            target="_blank"
                            href={UrlRouting.getGameUrl(
                              {
                                ...teamParams,
                                showTeamPlayTypes: true,
                                teamPlayTypeConfig: `||${player.code}||all||multi||`,
                              },
                              {}
                            )}
                          >
                            Team View<sup>*</sup>
                          </a>
                        </OverlayTrigger>
                      }
                    />,
                    "small"
                  ),
                ]
              : [],
          ]);
    };
    const tableData = _.take(players, parseInt(maxTableSize)).flatMap(
      (player, playerIndex) => {
        const nextYearState =
          startingState.includePrevYear && player.prevYear ? "y1ofN" : "y1of1";
        return builderPlayerLine(player, playerIndex, nextYearState).concat(
          startingState.includePrevYear && player.prevYear
            ? builderPlayerLine(player.prevYear, playerIndex, "y2of2")
            : []
        );
      }
    );

    setNumFilteredStr(
      isFiltered
        ? `, filtered: ${
            tier == "All" && numFiltered > parseInt(maxTableSize)
              ? `<${numFiltered - playerDuplicates}`
              : numFiltered - playerDuplicates
          }`
        : !_.isEmpty(transferInfoSplit[0]) && tier != "All"
        ? `, ${numFiltered} in tier`
        : ""
    );

    /** The sub-header builder - Can show some handy context in between the header and data rows: */
    const maybeSubheaderRow = showInfoSubHeader
      ? RosterTableUtils.buildInformationalSubheader(
          true,
          true,
          theme == "dark"
        )
      : [];

    return {
      table: (
        <GenericTable
          tableCopyId="playerLeaderboardTable"
          tableFields={
            showExpanded
              ? CommonTableDefs.onOffIndividualTable(
                  true,
                  possAsPct,
                  factorMins,
                  true
                )
              : CommonTableDefs.singleRowPlayerLeaderboardOnOffStyle(
                  factorMins,
                  startingState.useRapm === false ? false : true,
                  gender,
                  year,
                  isT100,
                  isConfOnly
                )
          }
          tableData={maybeSubheaderRow.concat(tableData)}
          cellTooltipMode="none"
          extraInfoLookups={{
            //(see buildLeaderboards)
            PREPROCESSING_WARNING:
              "The leaderboard version of this stat has been improved with some pre-processing so may not be identical to the on-demand values eg in the On/Off pages",
          }}
        />
      ),
      maybeMap: geoMode ? (
        <Form.Row>
          <Form.Group as={Col} sm="12">
            <PlayerGeoMapNoSsr
              players={
                tier != "All"
                  ? _.chain(players)
                  : _.chain(players).filter((player: any) => {
                      // See buildLeaderboards.naturalTier for this logic
                      //TODO: should fix this so we don't need AvailableTeams
                      // and there is no code duplication
                      // But for now this will do

                      const teamMeta = AvailableTeams.getTeam(
                        player.team || "???",
                        player.year || ParamDefaults.defaultLeaderboardYear,
                        gender
                      );
                      const isHigh = teamMeta?.category == "high";
                      const isEffHigh = effectivelyHighMajor.has(
                        player.team || "???"
                      );
                      const isLow =
                        teamMeta?.category == "low" ||
                        teamMeta?.category == "midlow";

                      return (
                        !teamMeta ||
                        ((isHigh || isEffHigh) && player.tier == "High") ||
                        (isLow && !isEffHigh && player.tier == "Low") ||
                        (!isEffHigh &&
                          !isHigh &&
                          !isLow &&
                          player.tier == "Medium")
                      );
                    })
              }
              center={geoCenterInfo}
              zoom={geoCenterInfo?.zoom}
              onBoundsToChange={() => {
                setGeoLoadingOverride(true);
              }}
              onBoundsChange={(
                boundsChecker: (lat: number, lon: number) => boolean,
                info: { lat: number; lon: number; zoom: number }
              ) => {
                if (
                  !geoBoundsChecker ||
                  info.lat != geoCenterInfo?.lat ||
                  info.lon != geoCenterInfo?.lon ||
                  info.zoom != geoCenterInfo?.zoom
                ) {
                  setGeoBoundsChecker(() => boundsChecker);
                  setGeoCenterInfo(info);
                } else {
                  setGeoLoadingOverride(false);
                }
              }}
            />
          </Form.Group>
        </Form.Row>
      ) : null,
    };
  }, [
    minPoss,
    maxTableSize,
    sortBy,
    filterStr,
    possAsPct,
    factorMins,
    useRapm,
    showGrades,
    divisionStatsRefresh,
    confs,
    posClasses,
    showInfoSubHeader,
    showRepeatingHeader,
    tier,
    advancedFilterStr,
    dataEvent,
    geoBoundsChecker,
    geoCenterInfo,
    showPlayerShots,
  ]);

  // 3.2] Sorting utils

  /** The sub-header builder */
  const formatGroupLabel = (data: any) => (
    <div>
      <span>{data.label}</span>
    </div>
  );

  // 3] Utils
  /** Sticks an overlay on top of the table if no query has ever been loaded */
  function needToLoadQuery() {
    return (
      !dataEvent.error &&
      (loadingOverride || (dataEvent?.players || []).length == 0)
    );
  }

  /** For use in selects */
  function sortStringToOption(s: string) {
    return sortOptionsByValue[s] || transferPredictionSorters[s];
  }
  function stringToOption(s: string) {
    return { label: s, value: s };
  }

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

  // Advanced filter text

  const linqEnableTooltip = (
    <Tooltip id="linqEnableTooltip">
      Enable the Linq filter editor, click on "?" for a guide on using Linq
    </Tooltip>
  );
  const linqEnableText = showHelp ? (
    <OverlayTrigger placement="auto" overlay={linqEnableTooltip}>
      <span>
        Linq
        <sup>
          <a target="_blank" href="https://hoop-explorer.blogspot.com/2022/03/">
            ?
          </a>
        </sup>
      </span>
    </OverlayTrigger>
  ) : (
    <span>Linq</span>
  );
  const basicFilterTooltip = (
    <Tooltip id="basicFilterTooltip">
      Simple text match for each of the ";"-separated list against a line of
      text with the player, team and year in various formats, in a format like{" "}
      <br />
      <br />
      {exampleForFilterStr
        ? buildFilterStringTest(exampleForFilterStr)
        : dataEvent?.players?.[0]
        ? buildFilterStringTest(dataEvent?.players[0])
        : "Honor, Nick Sr_NiHonor+Nick:Clemson_2021/22 Sr_NiHonor:Clemson_2021/22"}
      <br />
      <br />
      (Note text match is case-insensitive if the filter string is all lower
      case.)
      <br />
      <br />
      For more complex filtering enable Linq below.{" "}
    </Tooltip>
  );
  const basicFilterText = (
    <OverlayTrigger placement="auto" overlay={basicFilterTooltip}>
      <div>
        Filter<sup>*</sup>
      </div>
    </OverlayTrigger>
  );

  const tooltipForFilterPresets = (
    <Tooltip id="advancedFilterPresets">
      Preset player type advanced filters
    </Tooltip>
  );

  const buildFilterPresetMenuItem = (
    name: string,
    advancedFilter: string,
    posFilter: string
  ) => {
    return (
      <GenericTogglingMenuItem
        text={name}
        truthVal={
          advancedFilter == advancedFilterStr && posClasses == posFilter
        }
        onSelect={() => {
          friendlyChange(() => {
            setAdvancedFilterStr(advancedFilter);
            setPosClasses(posFilter);
          }, advancedFilter != advancedFilterStr || posClasses != posFilter);
        }}
      />
    );
  };

  // Position filter
  //TODO: duplicated in PlayerImpactChart - need to move to tables/PositionUtils

  function getCurrentPositionsOrPlaceholder() {
    return posClasses == ""
      ? { label: "All Positions" }
      : posClasses
          .split(",")
          .map((posClass: string) =>
            stringToOption(
              PositionUtils.nicknameToPosClass[posClass] || posClass
            )
          );
  }

  /** Slightly hacky code to render the position abbreviations */
  const PositionValueContainer = (props: any) => {
    const oldText = props.children[0];
    const fullPosition = oldText.props.children;
    const newText = {
      ...oldText,
      props: {
        ...oldText.props,
        children: [
          PositionUtils.posClassToNickname[fullPosition] || fullPosition,
        ],
      },
    };
    const newProps = {
      ...props,
      children: [newText, props.children[1]],
    };
    return <components.MultiValueContainer {...newProps} />;
  };

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

  return (
    <Container fluid>
      <LoadingOverlay
        active={needToLoadQuery()}
        spinner
        text={"Loading Player Leaderboard..."}
      >
        {dataEvent.syntheticData ? null : (
          <Form.Group as={Row}>
            <Col xs={6} sm={6} md={3} lg={2}>
              <Select
                styles={{ menu: (base: any) => ({ ...base, zIndex: 2000 }) }}
                value={stringToOption(genderUnreliable)}
                options={["Men", "Women"].map((gender) =>
                  stringToOption(gender)
                )}
                isSearchable={false}
                onChange={(option: any) => {
                  if ((option as any)?.value) {
                    const newGender = (option as any).value;
                    friendlyChange(
                      () => setGender(newGender),
                      newGender != gender
                    );
                  }
                }}
              />
            </Col>
            <Col xs={6} sm={6} md={3} lg={2}>
              <Select
                styles={{ menu: (base: any) => ({ ...base, zIndex: 2000 }) }}
                value={stringToOption(yearUnreliable)}
                options={DateUtils.lboardYearList(tier)
                  .filter((r) => {
                    return geoMode
                      ? r >= DateUtils.firstYearWithRosterGeoData &&
                          r.startsWith("2")
                      : true;
                  })
                  .map((r) => stringToOption(r))}
                isSearchable={false}
                onChange={(option: any) => {
                  if ((option as any)?.value) {
                    const newYear = (option as any).value;
                    friendlyChange(() => setYear(newYear), newYear != year);
                  }
                }}
              />
            </Col>
            <Col className="w-100" bsPrefix="d-lg-none d-md-none" />
            <Col xs={11} sm={11} md={6} lg={6}>
              <ConferenceSelector
                emptyLabel={`All ${
                  !_.isEmpty(transferInfoSplit[0]) ? "Transfers" : "Teams"
                } in ${tier} Tier${tier == "All" ? "s" : ""}`}
                confStr={confs}
                tier={tier}
                confMap={dataEvent?.confMap}
                confs={dataEvent?.confs}
                onChangeConf={(confStr) => {
                  if (confStr.indexOf("Tier") >= 0) {
                    const newTier = confStr.split(" ")[0];
                    friendlyChange(() => {
                      setTier(newTier);
                      setConfs("");
                    }, confs != "" || tier != newTier);
                  } else {
                    friendlyChange(() => setConfs(confStr), confs != confStr);
                  }
                }}
              />
            </Col>
            <Col xs={1} className="mt-1">
              {getCopyLinkButton()}
            </Col>
          </Form.Group>
        )}
        {maybeMap}
        <Form.Row>
          <Form.Group as={Col} sm="7">
            <InputGroup>
              <InputGroup.Prepend>
                <InputGroup.Text id="filter">{basicFilterText}</InputGroup.Text>
              </InputGroup.Prepend>
              <AsyncFormControl
                startingVal={filterStr}
                onChange={(t: string) => {
                  const newStr = PlayerLeaderboardTracking[t] || t;
                  friendlyChange(
                    () => setFilterStr(newStr),
                    newStr != filterStr
                  );
                }}
                timeout={500}
                placeholder="See 'Filter' tooltip for details"
              />
            </InputGroup>
          </Form.Group>
          <Col xs={12} sm={12} md={4} lg={4}>
            <Select
              isClearable={true}
              styles={{ menu: (base: any) => ({ ...base, zIndex: 1000 }) }}
              isMulti
              components={{ MultiValueContainer: PositionValueContainer }}
              value={getCurrentPositionsOrPlaceholder()}
              options={(PositionUtils.positionClasses || []).map((r) =>
                stringToOption(r)
              )}
              onChange={(optionsIn: any) => {
                const options = optionsIn as Array<any>;
                const selection = (options || []).map(
                  (option) => (option as any)?.value || ""
                );
                const posClassStr = selection
                  .filter((t: string) => t != "")
                  .map((c: string) => PositionUtils.posClassToNickname[c] || c)
                  .join(",");
                friendlyChange(
                  () => setPosClasses(posClassStr),
                  posClasses != posClassStr
                );
              }}
            />
          </Col>
        </Form.Row>
        <Form.Row>
          <Form.Group as={Col} xs={3} sm={3}>
            <InputGroup>
              <InputGroup.Prepend>
                <InputGroup.Text id="maxPlayers">Max Players</InputGroup.Text>
              </InputGroup.Prepend>
              <AsyncFormControl
                startingVal={startingMaxTableSize}
                validate={(t: string) => t.match("^[0-9]*$") != null}
                onChange={(t: string) =>
                  friendlyChange(() => setMaxTableSize(t), t != maxTableSize)
                }
                timeout={400}
                placeholder="eg 100"
              />
            </InputGroup>
          </Form.Group>
          <Form.Group as={Col} xs={6} sm={6}>
            <InputGroup>
              <InputGroup.Prepend>
                <InputGroup.Text id="sortBy">Sort By</InputGroup.Text>
              </InputGroup.Prepend>
              <Select
                className="w-75"
                styles={{ menu: (base: any) => ({ ...base, zIndex: 2000 }) }}
                value={sortStringToOption(sortBy)}
                options={groupedOptions}
                onChange={(option: any) => {
                  if ((option as any)?.value) {
                    const newSortBy = (option as any)?.value;
                    friendlyChange(
                      () => setSortBy(newSortBy),
                      sortBy != newSortBy
                    );
                  }
                }}
                formatGroupLabel={formatGroupLabel}
              />
            </InputGroup>
          </Form.Group>
          <Form.Group as={Col} xs={2} sm={2} className="mt-2">
            <Form.Check
              className="float-right"
              type="switch"
              id="linq"
              checked={showAdvancedFilter || advancedFilterStr.length > 0}
              onChange={() => {
                const isCurrentlySet =
                  showAdvancedFilter || advancedFilterStr.length > 0;
                if (!showAdvancedFilter || 0 == advancedFilterStr.length) {
                  // Just enabling/disabling the LINQ query with no implications on filter, so don't need a UX friendly change
                  setShowAdvancedFilter(!isCurrentlySet);
                } else {
                  friendlyChange(() => {
                    setAdvancedFilterStr("");
                    setShowAdvancedFilter(!isCurrentlySet);
                  }, true);
                }
              }}
              label={linqEnableText}
            />
          </Form.Group>
          <Form.Group as={Col} xs={1} sm={1} className="pt-1">
            <Dropdown alignRight style={{ maxHeight: "2.4rem" }}>
              <Dropdown.Toggle variant="outline-secondary">
                <OverlayTrigger
                  placement="auto"
                  overlay={tooltipForFilterPresets}
                >
                  <FontAwesomeIcon icon={faFilter} />
                </OverlayTrigger>
              </Dropdown.Toggle>
              <Dropdown.Menu show={showPresetsOnLoad ? true : undefined}>
                <GenericTogglingMenuItem
                  text={<i>Clear filter</i>}
                  truthVal={false}
                  onSelect={() => {
                    friendlyChange(() => {
                      setAdvancedFilterStr("");
                      setPosClasses("");
                    }, posClasses != "" || advancedFilterStr != "");
                  }}
                />
                {advancedFilterPresets.map((preset) =>
                  buildFilterPresetMenuItem(...preset)
                )}
              </Dropdown.Menu>
            </Dropdown>
          </Form.Group>
        </Form.Row>
        {showAdvancedFilter || advancedFilterStr.length > 0 ? (
          <Form.Row>
            <Col xs={12} sm={12} md={12} lg={12} className="pb-4">
              <LinqExpressionBuilder
                prompt="eg 'def_adj_rapm < -2 && off_3p > 0.35 && off_3pr >= 0.45 SORT_BY adj_rapm_prod_margin'"
                value={advancedFilterStr}
                error={advancedFilterError}
                autocomplete={
                  AdvancedFilterUtils.playerLboardWithTeamStatsAutocomplete
                }
                richTextReplacements={playerLeaderboardRichTextReplacements}
                callback={(newVal: string) =>
                  friendlyChange(() => setAdvancedFilterStr(newVal), true)
                }
                showHelp={showHelp}
              />
            </Col>
          </Form.Row>
        ) : null}
        <div></div>
        {/*(for some reason this div is needed to avoid the Row classnames getting confused - related to SSR?)*/}
        <StickyRow stickyEnabled={stickyQuickToggle}>
          <Col xs={12} sm={12} md={12} lg={8} className="pt-1">
            <ToggleButtonGroup
              items={(
                [
                  {
                    label: "Luck",
                    tooltip: "Statistics always adjusted for luck",
                    toggled: true,
                    onClick: () => {},
                  },
                  {
                    label: "RAPM",
                    tooltip: "Use RAPM (vs Adj Rtg) when displaying rankings",
                    toggled: useRapm,
                    onClick: () => friendlyChange(() => toggleUseRapm(), true),
                  },
                  {
                    label: "| ",
                    tooltip: "",
                    toggled: true,
                    onClick: () => {},
                    isLabelOnly: true,
                  },
                ]
                  .concat(
                    dataEvent.syntheticData
                      ? []
                      : [
                          {
                            label: "T100",
                            tooltip:
                              "Leaderboard of players vs T100 opposition",
                            toggled: isT100,
                            onClick: () =>
                              friendlyChange(() => {
                                setIsT100(!isT100);
                                setIsConfOnly(false);
                              }, true),
                          },
                          {
                            label: "Conf",
                            tooltip:
                              "Leaderboard of players vs conference opposition",
                            toggled: isConfOnly,
                            onClick: () =>
                              friendlyChange(() => {
                                setIsT100(false);
                                setIsConfOnly(!isConfOnly);
                              }, true),
                          },
                          {
                            label: "| ",
                            tooltip: "",
                            toggled: true,
                            onClick: () => {},
                            isLabelOnly: true,
                          },
                        ]
                  )
                  .concat([
                    {
                      label: "Poss%",
                      tooltip: possAsPct
                        ? "Show possessions as count"
                        : "Show possessions as percentage",
                      toggled: possAsPct,
                      onClick: () =>
                        friendlyChange(() => setPossAsPct(!possAsPct), true),
                    },
                    {
                      label: "* Mins%",
                      tooltip:
                        "Whether to incorporate % of minutes played into adjusted ratings (ie turns it into 'production per team 100 possessions')",
                      toggled: factorMins,
                      onClick: () =>
                        friendlyChange(() => toggleFactorMins(), true),
                    },
                    {
                      label: "| ",
                      tooltip: "",
                      toggled: true,
                      onClick: () => {},
                      isLabelOnly: true,
                    },
                    {
                      label: "Grades",
                      tooltip: showGrades
                        ? "Hide player ranks/percentiles"
                        : "Show player ranks/percentiles",
                      toggled: showGrades != "",
                      onClick: () =>
                        friendlyChange(
                          () =>
                            setShowGrades(
                              showGrades
                                ? ""
                                : ParamDefaults.defaultEnabledGrade
                            ),
                          true
                        ),
                    },
                  ])
                  .concat(
                    (year >= DateUtils.firstYearWithShotChartData ||
                      year == "All") &&
                      !dataEvent.syntheticData
                      ? [
                          {
                            label: "Shots",
                            tooltip:
                              "Show simple shot zones for first 50 players in table",
                            toggled: showPlayerShots,
                            onClick: () =>
                              friendlyChange(
                                () => setShowPlayerShots(!showPlayerShots),
                                true
                              ),
                          },
                        ]
                      : []
                  )
                  .concat(
                    !dataEvent.syntheticData
                      ? [
                          {
                            label: "Style",
                            tooltip: showPlayerPlayTypes
                              ? "Hide play style breakdowns"
                              : "Show play style breakdowns",
                            toggled: showPlayerPlayTypes,
                            onClick: () =>
                              friendlyChange(
                                () =>
                                  setShowPlayerPlayTypes(!showPlayerPlayTypes),
                                true
                              ),
                          },
                        ]
                      : []
                  )
                  .concat([
                    {
                      label: "| ",
                      tooltip: "",
                      toggled: true,
                      onClick: () => {},
                      isLabelOnly: true,
                    },
                    {
                      label: "+ Info",
                      tooltip: showInfoSubHeader
                        ? "Hide extra info sub-header"
                        : "Show extra info sub-header",
                      toggled: showInfoSubHeader,
                      onClick: () => setShowInfoSubHeader(!showInfoSubHeader),
                    },
                  ]) as Array<any>
              ).concat(
                showHelp
                  ? [
                      //TODO: what to show here?
                      // {
                      //   label: <a href="https://hoop-explorer.blogspot.com/2020/07/understanding-lineup-analyzer-page.html" target="_blank">?</a>,
                      //   tooltip: "Open a page that explains some of the elements of this table",
                      //   toggled: false,
                      //   onClick: () => {}
                      // }
                    ]
                  : []
              )}
            />
          </Col>
          <Col xs={11} sm={11} md={11} lg={3} className="pt-1">
            {!_.isEmpty(transferInfoSplit[0]) &&
            !_.isEmpty(dataEvent.transfers) ? (
              <div className="float-right">
                <small>
                  (Available transfers:{" "}
                  <b>{_.size(dataEvent?.transfers || {})}</b>
                  {numFilteredStr})
                </small>
              </div>
            ) : (
              <div className="float-right">
                <small>
                  (Qualifying players in tier:{" "}
                  <b>{dataEvent?.players?.length || 0}</b>
                  {numFilteredStr})
                </small>
              </div>
            )}
          </Col>
          <Form.Group as={Col} xs={1} sm={1} className="mb-1">
            <GenericTogglingMenu>
              <GenericTogglingMenuItem
                text={<i className="text-secondary">Adjust for Luck</i>}
                truthVal={true}
                onSelect={() => {}}
                helpLink={
                  showHelp
                    ? "https://hoop-explorer.blogspot.com/2020/07/luck-adjustment-details.html"
                    : undefined
                }
              />
              <GenericTogglingMenuItem
                text={<span>Factor minutes % into Adjusted Rating+</span>}
                truthVal={factorMins}
                onSelect={() => friendlyChange(() => toggleFactorMins(), true)}
              />
              <GenericTogglingMenuItem
                text="Show Player Ranks/Percentiles"
                truthVal={showGrades != ""}
                onSelect={() =>
                  friendlyChange(
                    () =>
                      setShowGrades(
                        showGrades ? "" : ParamDefaults.defaultEnabledGrade
                      ),
                    true
                  )
                }
              />
              <GenericTogglingMenuItem
                text={
                  <span>Use RAPM (vs Adj Rtg) when displaying rankings</span>
                }
                truthVal={useRapm}
                onSelect={() => friendlyChange(() => toggleUseRapm(), true)}
                helpLink={
                  showHelp
                    ? "https://hoop-explorer.blogspot.com/2020/03/understanding-team-report-onoff-page.html#RAPM"
                    : undefined
                }
              />
              <Dropdown.Divider />
              <GenericTogglingMenuItem
                text={
                  <span>
                    {possAsPct
                      ? "Show possessions as count"
                      : "Show possessions as % of team"}
                  </span>
                }
                truthVal={false}
                onSelect={() =>
                  friendlyChange(() => setPossAsPct(!possAsPct), true)
                }
              />
              <Dropdown.Divider />
              <GenericTogglingMenuItem
                text={<span>Include low-volume players</span>}
                truthVal={incLowVol}
                onSelect={() => {
                  friendlyChange(() => {
                    setIncLowVol(!incLowVol);
                  }, true);
                }}
              />
              <Dropdown.Divider />
              <GenericTogglingMenuItem
                text={
                  <span>
                    <FontAwesomeIcon icon={faClipboard} />
                    {"  "}Export all players to CSV
                  </span>
                }
                truthVal={false}
                onSelect={() => {
                  friendlyChange(() => {
                    navigator.clipboard.writeText(buildExportStr(false));
                    setLoadingOverride(false);
                  }, true);
                }}
              />
              <GenericTogglingMenuItem
                text={
                  <span>
                    <FontAwesomeIcon icon={faDownload} />
                    {"  "}Export all players to CSV
                  </span>
                }
                truthVal={false}
                onSelect={() => {
                  friendlyChange(() => {
                    const blob = new Blob([buildExportStr(false)], {
                      type: "text/plain",
                    });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = "all_player_stats.csv";
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    setLoadingOverride(false);
                  }, true);
                }}
              />
              <GenericTogglingMenuItem
                text={
                  <span>
                    <FontAwesomeIcon icon={faClipboard} />
                    {"  "}Export filtered players to CSV
                  </span>
                }
                truthVal={false}
                onSelect={() => {
                  friendlyChange(() => {
                    navigator.clipboard.writeText(buildExportStr(true));
                    setLoadingOverride(false);
                  }, true);
                }}
              />
              <GenericTogglingMenuItem
                text={
                  <span>
                    <FontAwesomeIcon icon={faDownload} />
                    {"  "}Export filtered players to CSV
                  </span>
                }
                truthVal={false}
                onSelect={() => {
                  friendlyChange(() => {
                    const blob = new Blob([buildExportStr(true)], {
                      type: "text/plain",
                    });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = "filtered_player_stats.csv";
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    setLoadingOverride(false);
                  }, true);
                }}
              />
              <Dropdown.Divider />
              <GenericTogglingMenuItem
                text={"Show extra info sub-header"}
                truthVal={showInfoSubHeader}
                onSelect={() => setShowInfoSubHeader(!showInfoSubHeader)}
              />
              <GenericTogglingMenuItem
                text={"Show repeating header every 10 rows"}
                truthVal={showRepeatingHeader}
                onSelect={() =>
                  friendlyChange(
                    () => setShowRepeatingHeader(!showRepeatingHeader),
                    true
                  )
                }
              />
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
          </Form.Group>
        </StickyRow>
        <Row className="mt-2">
          <Col style={{ paddingLeft: "5px", paddingRight: "5px" }}>
            {geoMode ? (
              <LoadingOverlay
                active={geoLoadingOverride}
                spinner
                text={"Geo filter changing..."}
              >
                {table}
              </LoadingOverlay>
            ) : (
              table
            )}
          </Col>
        </Row>
      </LoadingOverlay>
    </Container>
  );
};

export default PlayerLeaderboardTable;
