// React imports:
import React, { useState, useEffect, ReactNode } from "react";

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
} from "../utils/FilterModels";
import { useTheme } from "next-themes";
import { efficiencyAverages } from "../utils/public-data/efficiencyAverages";
import ShotChartDiagView, { UserChartOpts } from "./diags/ShotChartDiagView";
import { TableDisplayUtils } from "../utils/tables/TableDisplayUtils";
import GenericTable, { GenericTableOps } from "./GenericTable";
import { CommonTableDefs } from "../utils/tables/CommonTableDefs";
import { RosterTableUtils } from "../utils/tables/RosterTableUtils";
import {
  Button,
  Col,
  Container,
  Form,
  OverlayTrigger,
  Row,
  Tooltip,
} from "react-bootstrap";
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
import { PlayerSimilarityUtils } from "../utils/stats/PlayerSimilarityUtils";
//@ts-ignore
import LoadingOverlay from "@ronchalant/react-loading-overlay";
import StickyRow from "./shared/StickyRow";
import GenericTogglingMenuItem from "./shared/GenericTogglingMenuItem";
import { AnnotationMenuItems } from "./shared/AnnotationMenuItems";
import { GradeUtils } from "../utils/stats/GradeUtils";
import { FeatureFlags } from "../utils/stats/FeatureFlags";

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

  // Similarity controls state
  const [playStyleWeight, setPlayStyleWeight] = useState<number>(0.25);
  const [scoringEfficiencyWeight, setScoringEfficiencyWeight] =
    useState<number>(0.25);
  const [defenseWeight, setDefenseWeight] = useState<number>(0.25);
  const [classWeight, setClassWeight] = useState<number>(0.25);
  const [showSimilaritySettings, setShowSimilaritySettings] =
    useState<boolean>(false);

  // Temporary state for smooth slider updates
  const [tmpPlayStyleWeight, setTmpPlayStyleWeight] = useState<
    number | undefined
  >(undefined);
  const [tmpScoringEfficiencyWeight, setTmpScoringEfficiencyWeight] = useState<
    number | undefined
  >(undefined);
  const [tmpDefenseWeight, setTmpDefenseWeight] = useState<number | undefined>(
    undefined
  );
  const [tmpClassWeight, setTmpClassWeight] = useState<number | undefined>(
    undefined
  );

  // Mouse handling for sliders (similar to TeamLeaderboardTable)
  const onMouseDown = () => {
    // Start dragging - placeholder for potential future logic
  };

  const onMouseUp = (callback: () => void) => {
    // End dragging and execute callback
    callback();
  };

  /** Show team and individual grades */
  const [showGrades, setShowGrades] = useState(
    _.isNil(playerCareerParams.showGrades) ? "" : playerCareerParams.showGrades
  );

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

  const [showRepeatingHeader, setShowRepeatingHeader] = useState(
    true as boolean
  ); //(always defaults to on)

  /** Whether to make the quick toggle bar stick (default: on) - TODO: unused currently */
  const [stickyQuickToggle, setStickyQuickToggle] = useState(
    _.isNil(playerCareerParams.stickyQuickToggle)
      ? true
      : playerCareerParams.stickyQuickToggle
  );

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
  const extraCharts = showGrades || showPlayerPlayTypes || showShotCharts;
  const showEveryYear = multipleRowsPerYear || extraCharts;

  const playerRowBuilder = (
    player: IndivCareerStatSet,
    playerYear: string,
    topYear: boolean,
    titleOverride?: DataType,
    titleSuffix?: DataType
  ) => {
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
      ((player.off_adj_rapm_prod as Statistic)?.value || 0) -
      ((player.def_adj_rapm_prod as Statistic)?.value || 0);
    const adjMarginProd =
      ((player.off_adj_rapm as Statistic)?.value || 0) -
      ((player.def_adj_rapm as Statistic)?.value || 0);
    const adjMargin = factorMins ? adjMarginPer100 : adjMarginProd;
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
                `${playerCareerParams.gender}_${currPlayerSelected.year || ""}`
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
        return similarPlayers.map((player) => ({
          title: `${player.key}`,
          player: player,
          rosterStatsByCode: {},
          teamStats: {} as TeamStatSet,
          avgEfficiency:
            efficiencyAverages[
              `${playerCareerParams.gender}_${player.year || ""}`
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
                efficiencyAverages[`${playerCareerParams.gender}_${year}`] ||
                efficiencyAverages.fallback,
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

    //TODO: duplicate style quick switch
    const shotChartQuickSwitchOptions = selectedYearsDataTypeChain
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
          (playerSeason as any).off_shots = ShotChartUtils.decompressHexData(
            playerSeason.shotInfo as any
          );
        }

        return {
          title: `${year} (${infix})`,
          gender: playerCareerParams.gender || ParamDefaults.defaultGender,
          off: playerSeason.off_shots as any,
          def: {},
        };
      });

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
        <b style={adjMarginShadow}>
          [{(adjMargin > 0 ? "+" : "") + adjMargin.toFixed(1)}]
        </b>
      </OverlayTrigger>
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
        <br /> {adjMarginEl}
      </div>
    ) : undefined;

    player.off_title = formattedTitleOverride || (
      <div className="multi_line_title_content">
        <div className="multi_line_title_row">
          <span className="multi_line_title_row_left_aligned_snippet">
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
          {adjMarginEl}
        </div>
      </div>
    );

    // If we're in short form grades mode then build those:

    if (showGrades) {
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
      player.grades = predictedGrades;
    }

    // Finally build rows

    return _.flatten([
      !topYear && showEveryYear
        ? [
            GenericTableOps.buildHeaderRepeatRow(
              CommonTableDefs.repeatingOnOffIndivHeaderFields,
              "small"
            ),
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
      showGrades
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
            expandedView: true,
            possAsPct,
            factorMins,
            includeRapm: true,
            leaderboardMode: true,
          })
        : [],
      showShotCharts &&
      fullYear >= DateUtils.firstYearWithShotChartData &&
      player.shotInfo
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
                    chartOpts={shotChartConfig}
                    onChangeChartOpts={(newOpts: any) => {
                      setShotChartConfig(newOpts);
                    }}
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
      showPlayerPlayTypes && player.off_style
        ? [
            GenericTableOps.buildTextRow(
              <IndivPlayTypeDiagRadar
                title={player.key}
                player={player}
                rosterStatsByCode={{}}
                teamStats={{} as TeamStatSet}
                avgEfficiency={
                  efficiencyAverages[
                    `${playerCareerParams.gender}_${player.year}`
                  ] || efficiencyAverages.fallback
                }
                onChangeChartOpts={(opts: PlayerStyleOpts) => {
                  setShowPlayerPlayTypesPlayType(opts.playType);
                  setShowPlayerPlayTypesAdjPpp(!(opts.rawPpp ?? false));
                  //TODO quick switch is more complex
                }}
                userOpts={{
                  playType: showPlayerPlayTypesPlayType,
                  rawPpp: !showPlayerPlayTypesAdjPpp,
                }}
                quickSwitchOptions={playStyleQuickSwitchOptions}
                showGrades={showGrades}
                grades={divisionStatsCache[player.year || "??"]}
                showHelp={showHelp}
                compressedPlayTypeStats={player.off_style as any}
                navigationLinkOverride={navigationOverride(fullYear)}
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
      return _.flatten([seasonRows, confRows, t100Rows]);
    });

  const requestSimilarPlayers = () => {
    {
      const gender = playerCareerParams.gender || ParamDefaults.defaultGender;

      //TODO: make similarity query index
      if (currPlayerSelected) {
        setRetrievingPlayers(true);
        const allPromises = Promise.all(
          RequestUtils.requestHandlingLogic(
            {
              gender,
              queryVector:
                PlayerSimilarityUtils.buildPlayerSimilarityVector(
                  currPlayerSelected
                ).join(","),
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
            Number.NaN,
            isDebug
          )
        );
        allPromises
          .then((jsons) => {
            const playerJsons = (jsons?.[0]?.responses?.[0]?.hits?.hits || [])
              .map((p: any) => {
                const source = p._source || {};
                source._id = p._id;
                return source;
              })
              .filter(
                (p: any) =>
                  !_.isEmpty(p) &&
                  p._id != currPlayerSelected._id &&
                  _.endsWith(p._id, "_all")
              );

            setSimilarPlayers(playerJsons);
            setRetrievingPlayers(false);
          })
          .catch((__) => {
            setRetrievingPlayers(false);
            setSimilarPlayers([]);
          });
      }
    }
  };

  // Similarity controls component (separate variable but will be used in table)
  const similarityControlsComponent = (
    <div className="similarity-controls mt-2 mb-2">
      <Row>
        <Col xs={6} md={3}>
          <Form>
            <Form.Group controlId="playStyleRange">
              <Form.Label>
                <OverlayTrigger
                  placement="auto"
                  overlay={
                    <Tooltip id="play-style-tooltip">
                      How much to weight the scoring breakdown of the player (do
                      they drive? post-up? cut? find cutters and rollers? etc)
                    </Tooltip>
                  }
                >
                  <small>
                    <b>Play Style</b> [
                    {_.isNil(tmpPlayStyleWeight) ? (
                      <b>{(playStyleWeight * 100).toFixed(0)}</b>
                    ) : (
                      <i>{(tmpPlayStyleWeight * 100).toFixed(0)}</i>
                    )}
                    %]
                  </small>
                </OverlayTrigger>
              </Form.Label>
              <Form.Control
                type="range"
                custom
                value={
                  _.isNil(tmpPlayStyleWeight)
                    ? playStyleWeight
                    : tmpPlayStyleWeight
                }
                onChange={(ev: any) => {
                  const newVal = parseFloat(ev.target.value);
                  if (_.isNil(tmpPlayStyleWeight)) onMouseDown();
                  setTmpPlayStyleWeight(newVal);
                }}
                onClick={(ev: any) =>
                  onMouseUp(() => {
                    const newVal = parseFloat(ev.target.value);
                    setPlayStyleWeight(newVal);
                    setTmpPlayStyleWeight(undefined);
                  })
                }
                onTouchEnd={(ev: any) =>
                  onMouseUp(() => {
                    if (!_.isNil(tmpPlayStyleWeight)) {
                      const newVal = parseFloat(ev.target.value);
                      setPlayStyleWeight(newVal);
                      setTmpPlayStyleWeight(undefined);
                    }
                  })
                }
                onMouseUp={(ev: any) =>
                  onMouseUp(() => {
                    if (!_.isNil(tmpPlayStyleWeight)) {
                      const newVal = parseFloat(ev.target.value);
                      setPlayStyleWeight(newVal);
                      setTmpPlayStyleWeight(undefined);
                    }
                  })
                }
                min={0}
                max={1}
                step={0.05}
              />
            </Form.Group>
          </Form>
        </Col>
        <Col xs={6} md={3}>
          <Form>
            <Form.Group controlId="scoringEfficiencyRange">
              <Form.Label>
                <OverlayTrigger
                  placement="auto"
                  overlay={
                    <Tooltip id="scoring-efficiency-tooltip">
                      How good is the player at actually scoring in the various
                      play types covered by "Play Style"?
                    </Tooltip>
                  }
                >
                  <small>
                    <b>Scoring Efficiency</b> [
                    {_.isNil(tmpScoringEfficiencyWeight) ? (
                      <b>{(scoringEfficiencyWeight * 100).toFixed(0)}</b>
                    ) : (
                      <i>{(tmpScoringEfficiencyWeight * 100).toFixed(0)}</i>
                    )}
                    %]
                  </small>
                </OverlayTrigger>
              </Form.Label>
              <Form.Control
                type="range"
                custom
                value={
                  _.isNil(tmpScoringEfficiencyWeight)
                    ? scoringEfficiencyWeight
                    : tmpScoringEfficiencyWeight
                }
                onChange={(ev: any) => {
                  const newVal = parseFloat(ev.target.value);
                  if (_.isNil(tmpScoringEfficiencyWeight)) onMouseDown();
                  setTmpScoringEfficiencyWeight(newVal);
                }}
                onClick={(ev: any) =>
                  onMouseUp(() => {
                    const newVal = parseFloat(ev.target.value);
                    setScoringEfficiencyWeight(newVal);
                    setTmpScoringEfficiencyWeight(undefined);
                  })
                }
                onTouchEnd={(ev: any) =>
                  onMouseUp(() => {
                    if (!_.isNil(tmpScoringEfficiencyWeight)) {
                      const newVal = parseFloat(ev.target.value);
                      setScoringEfficiencyWeight(newVal);
                      setTmpScoringEfficiencyWeight(undefined);
                    }
                  })
                }
                onMouseUp={(ev: any) =>
                  onMouseUp(() => {
                    if (!_.isNil(tmpScoringEfficiencyWeight)) {
                      const newVal = parseFloat(ev.target.value);
                      setScoringEfficiencyWeight(newVal);
                      setTmpScoringEfficiencyWeight(undefined);
                    }
                  })
                }
                min={0}
                max={1}
                step={0.05}
              />
            </Form.Group>
          </Form>
        </Col>
        <Col xs={6} md={3}>
          <Form>
            <Form.Group controlId="defenseRange">
              <Form.Label>
                <OverlayTrigger
                  placement="auto"
                  overlay={
                    <Tooltip id="defense-tooltip">
                      How well (within the framework of their team's defense)
                      does the player defend, and in what measurable ways
                      (steals, fouls, blocks, rebounds)
                    </Tooltip>
                  }
                >
                  <small>
                    <b>Defense</b> [
                    {_.isNil(tmpDefenseWeight) ? (
                      <b>{(defenseWeight * 100).toFixed(0)}</b>
                    ) : (
                      <i>{(tmpDefenseWeight * 100).toFixed(0)}</i>
                    )}
                    %]
                  </small>
                </OverlayTrigger>
              </Form.Label>
              <Form.Control
                type="range"
                custom
                value={
                  _.isNil(tmpDefenseWeight) ? defenseWeight : tmpDefenseWeight
                }
                onChange={(ev: any) => {
                  const newVal = parseFloat(ev.target.value);
                  if (_.isNil(tmpDefenseWeight)) onMouseDown();
                  setTmpDefenseWeight(newVal);
                }}
                onClick={(ev: any) =>
                  onMouseUp(() => {
                    const newVal = parseFloat(ev.target.value);
                    setDefenseWeight(newVal);
                    setTmpDefenseWeight(undefined);
                  })
                }
                onTouchEnd={(ev: any) =>
                  onMouseUp(() => {
                    if (!_.isNil(tmpDefenseWeight)) {
                      const newVal = parseFloat(ev.target.value);
                      setDefenseWeight(newVal);
                      setTmpDefenseWeight(undefined);
                    }
                  })
                }
                onMouseUp={(ev: any) =>
                  onMouseUp(() => {
                    if (!_.isNil(tmpDefenseWeight)) {
                      const newVal = parseFloat(ev.target.value);
                      setDefenseWeight(newVal);
                      setTmpDefenseWeight(undefined);
                    }
                  })
                }
                min={0}
                max={1}
                step={0.05}
              />
            </Form.Group>
          </Form>
        </Col>
        <Col xs={6} md={3}>
          <Form>
            <Form.Group controlId="classRange">
              <Form.Label>
                <OverlayTrigger
                  placement="auto"
                  overlay={
                    <Tooltip id="class-tooltip">
                      Add a bonus for players in the same or nearby class (Fr,
                      Soph, Jr, Sr)
                    </Tooltip>
                  }
                >
                  <small>
                    <b>Class</b> [
                    {_.isNil(tmpClassWeight) ? (
                      <b>{(classWeight * 100).toFixed(0)}</b>
                    ) : (
                      <i>{(tmpClassWeight * 100).toFixed(0)}</i>
                    )}
                    %]
                  </small>
                </OverlayTrigger>
              </Form.Label>
              <Form.Control
                type="range"
                custom
                value={_.isNil(tmpClassWeight) ? classWeight : tmpClassWeight}
                onChange={(ev: any) => {
                  const newVal = parseFloat(ev.target.value);
                  if (_.isNil(tmpClassWeight)) onMouseDown();
                  setTmpClassWeight(newVal);
                }}
                onClick={(ev: any) =>
                  onMouseUp(() => {
                    const newVal = parseFloat(ev.target.value);
                    setClassWeight(newVal);
                    setTmpClassWeight(undefined);
                  })
                }
                onTouchEnd={(ev: any) =>
                  onMouseUp(() => {
                    if (!_.isNil(tmpClassWeight)) {
                      const newVal = parseFloat(ev.target.value);
                      setClassWeight(newVal);
                      setTmpClassWeight(undefined);
                    }
                  })
                }
                onMouseUp={(ev: any) =>
                  onMouseUp(() => {
                    if (!_.isNil(tmpClassWeight)) {
                      const newVal = parseFloat(ev.target.value);
                      setClassWeight(newVal);
                      setTmpClassWeight(undefined);
                    }
                  })
                }
                min={0}
                max={1}
                step={0.05}
              />
            </Form.Group>
          </Form>
        </Col>
      </Row>
    </div>
  );

  // Convert to table row
  const similarityControlsRow = GenericTableOps.buildTextRow(
    similarityControlsComponent,
    "text-center"
  );

  const tableData = _.thru(playerSimilarityMode, (__) => {
    if (playerSimilarityMode) {
      const hasPlayers = !_.isEmpty(similarPlayers);

      if (!hasPlayers) {
        // Case 1 & 2: No similar players - show button with controls below
        const buttonRow = GenericTableOps.buildTextRow(
          <Button onClick={() => requestSimilarPlayers()}>
            Find Similar Players
          </Button>,
          "text-center"
        );

        return tableDataPhase1Chain
          .concat([buttonRow])
          .concat([similarityControlsRow])
          .value();
      } else {
        // Case 3 & 4: Has similar players - show header with experiment/hide settings link
        const experimentLink = showSimilaritySettings
          ? "hide settings"
          : "experiment";
        const similarityRow = GenericTableOps.buildTextRow(
          <span>
            <i>
              Similar Players: (
              <a href="#" onClick={() => setSimilarPlayers([])}>
                clear
              </a>
              ) | (
              <a
                href="#"
                onClick={() =>
                  setShowSimilaritySettings(!showSimilaritySettings)
                }
              >
                {experimentLink}
              </a>
              )
            </i>
          </span>,
          "text-center"
        );

        const experimentButtonRow = showSimilaritySettings
          ? GenericTableOps.buildTextRow(
              <Button onClick={() => requestSimilarPlayers()}>
                Find Similar Players
              </Button>,
              "text-center"
            )
          : null;

        return tableDataPhase1Chain
          .concat([similarityRow])
          .concat(showSimilaritySettings ? [similarityControlsRow] : [])
          .concat(experimentButtonRow ? [experimentButtonRow] : [])
          .concat(
            _.flatMap(similarPlayers, (p, i) => {
              return playerRowBuilder(p, p.year || "????", i == 0);
            })
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
      tableCopyId="playerLeaderboardTable"
      tableFields={CommonTableDefs.onOffIndividualTable(
        true,
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
        showGrades &&
        FeatureFlags.isActiveWindow(FeatureFlags.integratedGradeView)
          ? {
              hybridMode: !showGrades.includes(":Integrated"),
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

  const buildTopLevelGradeControls =
    showGrades && FeatureFlags.isActiveWindow(FeatureFlags.integratedGradeView);
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
              //TODO add a useState here
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
              disabled: !_.isEmpty(similarPlayers), //(locked until you clear players)
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
        .concat([
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
            disabled:
              (!playerSimilarityMode && !showConf && !showT100) ||
              !_.isEmpty(similarPlayers),
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
            disabled: !_.isEmpty(similarPlayers),
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
            disabled: !_.isEmpty(similarPlayers),
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
            label: "Grades",
            tooltip: showGrades
              ? "Hide player ranks/percentiles"
              : "Show player ranks/percentiles",
            toggled: showGrades != "",
            onClick: () =>
              setShowGrades(
                showGrades ? "" : ParamDefaults.defaultEnabledGrade
              ),
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
        ])}
    />
  );

  const optionsDropdown = (
    <GenericTogglingMenu>
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
        <StickyRow className="mb-2" stickyEnabled={stickyQuickToggle}>
          <Col sm="11">
            {quickToggleBar}
            {topLevelGradeControls ? (
              <div className="pt-1">{topLevelGradeControls}</div>
            ) : undefined}
          </Col>
          <Form.Group as={Col} sm="1" className="mb-0">
            {optionsDropdown}
          </Form.Group>
        </StickyRow>
        <Row>{table}</Row>
      </LoadingOverlay>
    </Container>
  );
};

export default PlayerCareerTable;
