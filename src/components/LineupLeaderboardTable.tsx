// React imports:
import React, { useState, useEffect } from "react";

// Next imports:
import { NextPage } from "next";

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
//@ts-ignore
import Select, { components, createFilter } from "react-select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLink,
  faClipboard,
  faDownload,
} from "@fortawesome/free-solid-svg-icons";
import ClipboardJS from "clipboard";

// Component imports
import GenericTable, {
  GenericTableOps,
  GenericTableColProps,
} from "./GenericTable";
import { RosterStatsModel } from "./RosterStatsTable";
import { TeamStatsModel } from "./TeamStatsTable";
import LuckConfigModal from "./shared/LuckConfigModal";
import GenericTogglingMenu from "./shared/GenericTogglingMenu";
import GenericTogglingMenuItem from "./shared/GenericTogglingMenuItem";
import ToggleButtonGroup from "./shared/ToggleButtonGroup";
import LuckAdjDiagView from "./diags/LuckAdjDiagView";
import AsyncFormControl from "./shared/AsyncFormControl";

// Table building
import { TableDisplayUtils } from "../utils/tables/TableDisplayUtils";
import { LineupTableUtils } from "../utils/tables/LineupTableUtils";

// Util imports
import { UrlRouting } from "../utils/UrlRouting";
import { LineupUtils } from "../utils/stats/LineupUtils";
import { CbbColors } from "../utils/CbbColors";
import { CommonTableDefs } from "../utils/tables/CommonTableDefs";
import { PositionUtils } from "../utils/stats/PositionUtils";
import { efficiencyAverages } from "../utils/public-data/efficiencyAverages";
import {
  LineupLeaderboardParams,
  ParamDefaults,
  LuckParams,
} from "../utils/FilterModels";
import { AvailableTeams } from "../utils/internal-data/AvailableTeams";
import {
  ConferenceToNickname,
  NicknameToConference,
  Power6Conferences,
} from "../utils/public-data/ConferenceInfo";

import { DateUtils } from "../utils/DateUtils";
import { LineupStatSet, IndivPosInfo } from "../utils/StatModels";
import ConferenceSelector from "./shared/ConferenceSelector";
import { line } from "d3";
import { AdvancedFilterUtils } from "../utils/AdvancedFilterUtils";
import ThemedSelect from "./shared/ThemedSelect";
import YearSelector from "./shared/YearSelector";

export type LineupLeaderboardStatsModel = {
  lineups?: Array<any>;
  confs?: Array<string>;
  confMap?: Map<string, Array<string>>;
  lastUpdated?: number;
  error?: string;
};
type Props = {
  startingState: LineupLeaderboardParams;
  dataEvent: LineupLeaderboardStatsModel;
  onChangeState: (newParams: LineupLeaderboardParams) => void;
};

// Some static methods

const sortOptions: Array<any> = _.flatten(
  _.toPairs(CommonTableDefs.lineupTable(false))
    .filter(
      (keycol) =>
        keycol[1].colName &&
        keycol[1].colName != "" &&
        (!_.isString(keycol[1].colName) ||
          !_.startsWith(keycol[1].colName, "__"))
    )
    .map((keycol) => {
      return [
        ["desc", "off"],
        ["asc", "off"],
        ["desc", "def"],
        ["asc", "def"],
        ["desc", "diff"],
        ["asc", "diff"],
      ].map((combo) => {
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
        return {
          label: `${keycol[1].colName} (${ascOrDesc(combo[0])} / ${offOrDef(
            combo[1]
          )})`,
          value: `${combo[0]}:${combo[1]}_${keycol[0]}`,
        };
      });
    })
);
const sortOptionsByValue = _.fromPairs(
  sortOptions.map((opt) => [opt.value, opt])
);
/** Put these options at the front */
const mostUsefulSubset = [
  "desc:diff_adj_ppp",
  "desc:off_adj_ppp",
  "asc:def_adj_ppp",
  "desc:off_poss",
];
/** The two sub-headers for the dropdown */
const groupedOptions = [
  {
    label: "Most useful",
    options: _.chain(sortOptionsByValue)
      .pick(mostUsefulSubset)
      .values()
      .value(),
  },
  {
    label: "Other",
    options: _.chain(sortOptionsByValue)
      .omit(mostUsefulSubset)
      .values()
      .value(),
  },
];

/** When showing across multiple data sets, don't show intra-year rankings unless it's a full data set */
const fullDataSetSeasons = new Set(DateUtils.coreYears);

// Functional component

const LineupLeaderboardTable: React.FunctionComponent<Props> = ({
  startingState,
  dataEvent,
  onChangeState,
}) => {
  const server =
    typeof window === `undefined` //(ensures SSR code still compiles)
      ? "server"
      : window.location.hostname;

  /** Only show help for diagnstic on/off on main page */
  const showHelp = !_.startsWith(server, "cbb-on-off-analyzer");

  // 1] Data Model

  const [clipboard, setClipboard] = useState(null as null | ClipboardJS);

  // 2] State

  // Data source
  const [confs, setConfs] = useState(startingState.conf || "");
  const [year, setYear] = useState(
    startingState.year || ParamDefaults.defaultLeaderboardYear
  );
  const [gender, setGender] = useState(
    startingState.gender || ParamDefaults.defaultGender
  );
  const isMultiYr = year == "Extra" || year == "All";

  const [tier, setTier] = useState(
    startingState.tier || ParamDefaults.defaultTier
  );

  // Misc display

  /** Set this to be true on expensive operations */
  const [loadingOverride, setLoadingOverride] = useState(false);

  const startingMinPoss =
    startingState.minPoss || ParamDefaults.defaultLineupLboardMinPos;
  const [minPoss, setMinPoss] = useState(startingMinPoss);
  const startingMaxTableSize =
    startingState.maxTableSize || ParamDefaults.defaultLineupLboardMaxTableSize;
  const [maxTableSize, setMaxTableSize] = useState(startingMaxTableSize);
  const [sortBy, setSortBy] = useState(
    startingState.sortBy || ParamDefaults.defaultLineupLboardSortBy
  );
  const [filterStr, setFilterStr] = useState(
    startingState.filter || ParamDefaults.defaultLineupLboardFilter
  );

  const [isT100, setIsT100] = useState(startingState.t100 || false);
  const [isConfOnly, setIsConfOnly] = useState(startingState.confOnly || false);

  const [lineupFilters, setLineupFilters] = useState(
    (startingState.lineupFilters
      ? new Set(startingState.lineupFilters.split(","))
      : new Set()) as Set<"0-PG" | "2-PG" | "4-G" | "5-Out" | "2-Big">
  );

  const [showRepeatingHeader, setShowRepeatingHeader] = useState(
    true as boolean
  ); //(always start as true)

  // Luck:

  /** Whether to show the luck diagnostics */
  const [showLuckAdjDiags, setShowLuckAdjDiags] = useState(
    _.isNil(startingState.showLineupLuckDiags)
      ? ParamDefaults.defaultLineupLboardLuckDiagMode
      : startingState.showLineupLuckDiags
  );

  // Table configuration:

  /** Currently selected table preset */
  const [tablePreset, setTablePreset] = useState<string | undefined>(
    startingState.tablePreset
  );
  /** Extra columns added to table */
  const [tableConfigExtraCols, setTableConfigExtraCols] = useState<string[]>(
    startingState.tableConfigExtraCols || []
  );
  /** Disabled table columns */
  const [tableConfigDisabledCols, setTableConfigDisabledCols] = useState<
    string[] | undefined
  >(startingState.tableConfigDisabledCols);

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
    const newState = {
      ...startingState,
      conf: confs,
      tier: tier,
      gender: gender,
      year: year,
      t100: isT100,
      confOnly: isConfOnly,
      // Luck
      showLineupLuckDiags: showLuckAdjDiags,
      // Misc filters
      minPoss: minPoss,
      maxTableSize: maxTableSize,
      sortBy: sortBy,
      filter: filterStr,
      lineupFilters: Array.from(lineupFilters).join(","),
      // Table configuration
      tablePreset: tablePreset,
      tableConfigExtraCols: tableConfigExtraCols,
      tableConfigDisabledCols: tableConfigDisabledCols,
    };
    onChangeState(newState);
  }, [
    minPoss,
    maxTableSize,
    sortBy,
    filterStr,
    showLuckAdjDiags,
    isT100,
    isConfOnly,
    lineupFilters,
    confs,
    tier,
    year,
    gender,
    tablePreset,
    tableConfigExtraCols,
    tableConfigDisabledCols,
  ]);

  // 3] Utils

  // 3.0] Luck calculations:

  const genderYearLookup = `${startingState.gender}_${startingState.year}`;
  const avgEfficiency =
    efficiencyAverages[genderYearLookup] || efficiencyAverages.fallback;

  // 3.1] Build individual info

  // 3.2] Table building

  const offPrefixFn = (key: string) => "off_" + key;
  const offCellMetaFn = (key: string, val: any) => "off";
  const defPrefixFn = (key: string) => "def_" + key;
  const defCellMetaFn = (key: string, val: any) => "def";

  /** Only rebuild the expensive table if one of the parameters that controls it changes */
  const table = React.useMemo(() => {
    setLoadingOverride(false); //(rendering)

    const confSet = confs
      ? new Set(
          _.flatMap((confs || "").split(","), (c) =>
            c == "P6" ? Power6Conferences : [NicknameToConference[c] || c]
          )
        )
      : undefined;

    const dataEventLineups = (dataEvent?.lineups ||
      []) as unknown as LineupStatSet[];
    const minPossNum = parseInt(minPoss) || 0;
    const confDataEventLineups = dataEventLineups
      .filter((lineup) => {
        return (
          (!confSet || confSet.has(lineup.conf || "Unknown")) &&
          (lineup.off_poss?.value || 0) >= minPossNum
        );
        //(we do the "spurious" minPossNum check so we can detect filter presence and use to add a ranking)
      })
      .filter((lineup) => {
        //Positional filters
        if (lineupFilters.size > 0) {
          const teamSeasonLookup = `${startingState.gender}_${lineup.team}_${lineup.year}`;
          const perLineupBaselinePlayerMap = lineup.player_info || {};
          const positionFromPlayerKey = lineup.player_info || {};
          const codesAndIds = LineupTableUtils.buildCodesAndIds(lineup);
          const sortedCodesAndIds = PositionUtils.orderLineup(
            codesAndIds,
            positionFromPlayerKey,
            teamSeasonLookup
          );

          const isPassyG = (playerId: string) => {
            const plStats = perLineupBaselinePlayerMap[playerId] || {};
            const assistRate = plStats.off_assist?.value || 0;
            const pos = positionFromPlayerKey[playerId]?.posClass || "";
            const isPassyCG =
              (pos == "CG" || pos == "G?") && assistRate >= 0.19;

            return pos == "PG" || pos == "s-PG" || isPassyCG;
          };

          if (lineupFilters.has("0-PG")) {
            if (isPassyG(sortedCodesAndIds[0]!.id!)) return false;
          }
          if (lineupFilters.has("2-PG")) {
            if (!isPassyG(sortedCodesAndIds[0]!.id!)) return false;
            if (!isPassyG(sortedCodesAndIds[1]!.id!)) return false;
          }
          if (lineupFilters.has("4-G")) {
            const pos3 =
              positionFromPlayerKey[sortedCodesAndIds[3]!.id!]?.posClass || "";
            if (!_.endsWith(pos3, "G") || pos3 == "G?") return false;
          }
          if (lineupFilters.has("5-Out")) {
            const pos4 =
              positionFromPlayerKey[sortedCodesAndIds[4]!.id!]?.posClass || "";
            if (pos4 == "PF/C" || pos4 == "C" || pos4 == "F/C?") return false;
          }
          if (lineupFilters.has("2-Big")) {
            const pos3 =
              positionFromPlayerKey[sortedCodesAndIds[3]!.id!]?.posClass || "";
            if (pos3 != "PF/C" && pos3 != "C") return false;
          }
        }
        return true;
      });
    const [lineups, ignoreDroppedLineups] =
      LineupTableUtils.buildFilteredLineups(
        confDataEventLineups,
        filterStr,
        year != "All" &&
          tier != "All" &&
          sortBy == ParamDefaults.defaultLineupLboardSortBy
          ? undefined
          : sortBy,
        minPoss,
        maxTableSize,
        undefined,
        undefined //<-calc from lineup
      );

    /** Either the sort is not one of the 3 pre-calced, or there is a filter */
    const isGeneralSortOrFilter =
      (sortBy != ParamDefaults.defaultLineupLboardSortBy &&
        sortBy != "desc:off_adj_ppp" &&
        sortBy != "asc:def_adj_ppp") ||
      confDataEventLineups.length < dataEventLineups.length ||
      (filterStr || "") != "" ||
      year == "All" ||
      lineupFilters.size > 0;
    const tableData = lineups.flatMap((lineup, lineupIndex) => {
      const teamSeasonLookup = `${startingState.gender}_${lineup.team}_${lineup.year}`;

      // Rebuild net margin in case the raw data doesn't include it:
      LineupUtils.buildEfficiencyMargins(lineup, "value");
      if (!_.isNil(lineup?.off_ppp?.old_value)) {
        //(luck adjusted mode)
        LineupUtils.buildEfficiencyMargins(lineup, "old_value");
        lineup.off_net.override = "Adjusted from Off 3P% and Def 3P%";
        lineup.off_raw_net.override = "Adjusted from Off 3P% and Def 3P%";
      }
      TableDisplayUtils.injectPlayTypeInfo(
        lineup,
        false,
        false,
        teamSeasonLookup
      ); //(inject assist+tempo numbers)

      const perLineupBaselinePlayerMap = lineup.player_info || {};
      const positionFromPlayerKey = lineup.player_info || {};
      const codesAndIds = LineupTableUtils.buildCodesAndIds(lineup);
      const sortedCodesAndIds = PositionUtils.orderLineup(
        codesAndIds,
        positionFromPlayerKey,
        teamSeasonLookup
      );

      const lineupTitleKey = "" + lineupIndex;
      const subTitle = sortedCodesAndIds
        ? TableDisplayUtils.buildDecoratedLineup(
            lineupTitleKey,
            sortedCodesAndIds,
            perLineupBaselinePlayerMap,
            positionFromPlayerKey,
            "off_adj_rtg",
            true,
            ParamDefaults.defaultLineupFontSize,
            {
              team: lineup.team,
              year: lineup.year,
              gender,
              queryFilters: isConfOnly ? "Conf" : undefined,
              maxRank: isT100 ? "100" : "400",
            }
          )
        : "Weighted Total";

      const adjMargin =
        (lineup.off_adj_ppp?.value || 0) - (lineup.def_adj_ppp?.value || 0);
      const adjMarginStr = `${adjMargin > 0.0 ? "+" : ""}${adjMargin.toFixed(
        1
      )}`;
      const generalRank = isGeneralSortOrFilter ? (
        <span>
          <i>(#{lineupIndex + 1})</i>&nbsp;
        </span>
      ) : null;

      const rankingsTooltip = (
        <Tooltip id={`rankings_${lineupIndex}`}>
          Ranks:
          <br />
          {isGeneralSortOrFilter ? "[filtered/sorted subset] " : ""}
          {isGeneralSortOrFilter ? <br /> : null}
          [Adj Net Efficiency]
          <br />
          [Adj Offensive Efficiency]
          <br />
          [Adj Defensive Efficiency]
        </Tooltip>
      );

      const shortTier = ((lineup.tier as String) || "").substring(0, 1);
      const marginRank =
        sortBy == "desc:diff_adj_ppp" ? (
          <b>
            #{shortTier}
            {lineup.adj_margin_rank}
          </b>
        ) : (
          `${shortTier}#${lineup.adj_margin_rank}`
        );
      const offRank =
        sortBy == "desc:off_adj_ppp" ? (
          <b>
            <big>#{lineup.off_adj_ppp_rank}</big>
          </b>
        ) : (
          `#${lineup.off_adj_ppp_rank}`
        );
      const defRank =
        sortBy == "asc:def_adj_ppp" ? (
          <b>
            <big>#{lineup.def_adj_ppp_rank}</big>
          </b>
        ) : (
          `#${lineup.def_adj_ppp_rank}`
        );
      const seasonRankings =
        year == "All" && !fullDataSetSeasons.has(lineup.year || "") ? (
          "(no ranking)"
        ) : (
          <span>
            {marginRank} ({offRank} / {defRank})
          </span>
        );
      const rankings = (
        <OverlayTrigger placement="auto" overlay={rankingsTooltip}>
          <span className="float-left">
            {generalRank}
            <small>{seasonRankings}</small>
          </span>
        </OverlayTrigger>
      );

      const confNickname = ConferenceToNickname[lineup.conf || "???"] || "???";

      const teamTooltip = (
        <Tooltip id={`team_${lineupIndex}`}>
          Open new tab with all lineups for this team
        </Tooltip>
      );
      const teamParams = {
        team: lineup.team,
        gender: gender,
        year: year,
        minRank: "0",
        maxRank: isT100 ? "100" : "400",
        queryFilters: isConfOnly ? "Conf" : undefined,
        lineupLuck: true,
      };
      const maybeYrStr = isMultiYr
        ? ` '${(lineup.year || "").substring(2, 4)}+`
        : ``;
      const teamEl = (
        <OverlayTrigger placement="auto" overlay={teamTooltip}>
          <a target="_blank" href={UrlRouting.getLineupUrl(teamParams, {})}>
            <b>
              {lineup.team}
              {maybeYrStr}
            </b>
          </a>
        </OverlayTrigger>
      );

      const adjMarginHtml = lineup.off_net ? (
        ""
      ) : (
        <span>
          &nbsp;[<b>{adjMarginStr}</b>]
        </span>
      );
      const title = (
        <div>
          <span className="">
            {rankings}
            &nbsp;
            <span>
              {teamEl} (<span>{confNickname}</span>){adjMarginHtml}
            </span>
          </span>
          <br />
          {subTitle}
        </div>
      );

      const stats = { off_title: title, def_title: "", ...lineup };

      const isUsingLuckAndShowingDiags =
        showLuckAdjDiags && lineup.off_luck_diags;
      const showRepeatingHeaderThisLine =
        showRepeatingHeader &&
        !isUsingLuckAndShowingDiags &&
        lineupIndex > 0 &&
        0 == lineupIndex % 5;

      return _.flatten([
        isUsingLuckAndShowingDiags && showRepeatingHeader && lineupIndex > 0
          ? [
              GenericTableOps.buildHeaderRepeatRow(
                CommonTableDefs.repeatingLineupHeaderFields,
                "small"
              ),
            ]
          : [],
        showRepeatingHeaderThisLine
          ? [
              GenericTableOps.buildHeaderRepeatRow(
                CommonTableDefs.repeatingLineupHeaderFields,
                "small"
              ),
              GenericTableOps.buildRowSeparator(),
            ]
          : [],
        [GenericTableOps.buildDataRow(stats, offPrefixFn, offCellMetaFn)],
        [GenericTableOps.buildDataRow(stats, defPrefixFn, defCellMetaFn)],
        showLuckAdjDiags && lineup.off_luck_diags && lineup.def_luck_diags
          ? [
              GenericTableOps.buildTextRow(
                <LuckAdjDiagView
                  name="lineup"
                  offLuck={lineup.off_luck_diags}
                  defLuck={lineup.def_luck_diags}
                  baseline={"season"}
                  showHelp={showHelp}
                />,
                "small pt-2"
              ),
            ]
          : [],
        [GenericTableOps.buildRowSeparator("1px")],
      ]);
    });
    return (
      <GenericTable
        showConfigureColumns={true}
        initialColumnConfig={{
          newCol: tableConfigExtraCols,
          disabledCols: tableConfigDisabledCols,
        }}
        onColumnConfigChange={(config) => {
          setTableConfigExtraCols(config.newCol);
          setTableConfigDisabledCols(config.disabledCols);
        }}
        onPresetChange={(preset) => {
          setTablePreset(preset);
          // Reset overrides:
          setTableConfigExtraCols([]);
          setTableConfigDisabledCols(undefined);
        }}
        presetOverride={tablePreset}
        tableCopyId="lineupLeaderboardTable"
        tableFields={CommonTableDefs.lineupTable(false)}
        tableData={tableData}
        cellTooltipMode="none"
      />
    );
  }, [
    minPoss,
    maxTableSize,
    sortBy,
    filterStr,
    showLuckAdjDiags,
    confs,
    lineupFilters,
    showRepeatingHeader,
    dataEvent,
    tablePreset,
  ]);

  // 3.2] Sorting utils

  /** The sub-header builder */
  const formatGroupLabel = (data: any) => (
    <div>
      <span>{data.label}</span>
    </div>
  );

  // 3.3] Export Utils

  /** Export teams to string */
  const buildExportStr = (filtered: boolean): string => {
    //TODO: need to support filter

    const { lineupsPhase1, isFiltered } = {
      lineupsPhase1: [],
      isFiltered: false,
    };
    // phase1Processing(
    //   dataEvent?.players || [],
    //   filtered
    // );
    const [lineups, ignoreDroppedLineups] =
      LineupTableUtils.buildFilteredLineups(
        (dataEvent?.lineups || []) as unknown as LineupStatSet[],
        "", //(filterStr)
        year != "All" &&
          tier != "All" &&
          sortBy == ParamDefaults.defaultLineupLboardSortBy
          ? undefined
          : sortBy,
        "0", //minPoss
        "100000", //maxTableSize - ie "all of them"
        undefined,
        undefined //<-calc from lineup
      );

    // Enrich with sorted player info
    lineups.forEach((lineup) => {
      const teamSeasonLookup = `${startingState.gender}_${lineup.team}_${lineup.year}`;
      const perLineupBaselinePlayerMap = lineup.player_info || {};
      const positionFromPlayerKey = lineup.player_info || {};
      const codesAndIds = LineupTableUtils.buildCodesAndIds(lineup);
      const sortedCodesAndIds = PositionUtils.orderLineup(
        codesAndIds,
        positionFromPlayerKey,
        teamSeasonLookup
      );
      //(for export)
      (lineup as any).player_stats = codesAndIds.map(
        (codeId) => (lineup.player_info || {})[codeId.id] || {}
      );
      (lineup as any).team_name = lineup.team;
      lineup.off_team_poss = lineup.off_poss;
      lineup.def_team_poss = lineup.def_poss;
    });

    const [header, dataRows] = AdvancedFilterUtils.generateLineupLeaderboardCsv(
      "",
      lineups,
      (
        year: string //(we only use this to inject team stats explicitly mentioned so ignore whether grades are enabled)
      ) => undefined
    );

    return [header].concat(dataRows).join("\n");
  };

  // 3] Utils
  /** Sticks an overlay on top of the table if no query has ever been loaded */
  function needToLoadQuery() {
    return (
      !dataEvent.error &&
      (loadingOverride || (dataEvent?.lineups || []).length == 0)
    );
  }

  /** For use in selects */
  function sortStringToOption(s: string) {
    return sortOptionsByValue[s];
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
          id={`copyLink_lineupLeaderboard`}
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
      var newClipboard = new ClipboardJS(`#copyLink_lineupLeaderboard`, {
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

  function getCurrentConfsOrPlaceholder() {
    return confs == ""
      ? { label: `All Teams in ${tier} Tier` }
      : confs
          .split(",")
          .map((conf: string) =>
            stringToOption(NicknameToConference[conf] || conf)
          );
  }

  /** Slightly hacky code to render the conference nick names */
  const ConferenceValueContainer = (props: any) => {
    const oldText = props.children[0];
    const fullConfname = oldText.props.children;
    const newText = {
      ...oldText,
      props: {
        ...oldText.props,
        children: [ConferenceToNickname[fullConfname] || fullConfname],
      },
    };
    const newProps = {
      ...props,
      children: [newText, props.children[1]],
    };
    return <components.MultiValueContainer {...newProps} />;
  };

  /** Handles the complexity of changing the set of positional filters */
  const toggleLineupFilters = (
    s: "0-PG" | "2-PG" | "4-G" | "5-Out" | "2-Big"
  ) => {
    const tmp = new Set(lineupFilters);
    if (tmp.has(s)) {
      tmp.delete(s);
    } else {
      tmp.add(s);
    }
    // Some extra logic:
    if (s == "0-PG" && tmp.has("0-PG")) {
      tmp.delete("2-PG");
    } else if (s == "2-PG" && tmp.has("2-PG")) {
      tmp.delete("0-PG");
    } else if (s == "5-Out" && tmp.has("5-Out")) {
      tmp.delete("2-Big");
    } else if (s == "4-G" && tmp.has("4-G")) {
      tmp.delete("2-Big");
    } else if (s == "2-Big" && tmp.has("2-Big")) {
      tmp.delete("4-G");
      tmp.delete("5-Out");
    }
    setLineupFilters(tmp);
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

  const confsWithTeams = dataEvent?.confMap
    ? _.toPairs(dataEvent?.confMap || {}).map((kv) => {
        const teams = kv[1] || [];
        return _.isEmpty(teams) ? kv[0] : `${kv[0]} [${teams.join(", ")}]`;
      })
    : dataEvent?.confs || [];

  return (
    <Container fluid>
      <LoadingOverlay
        active={needToLoadQuery()}
        spinner
        text={"Loading Lineup Leaderboard..."}
      >
        <Form.Group as={Row}>
          <Col xs={6} sm={6} md={3} lg={2}>
            <ThemedSelect
              value={stringToOption(gender)}
              options={["Men", "Women"].map((gender) => stringToOption(gender))}
              isSearchable={false}
              onChange={(option: any) => {
                if ((option as any)?.value) setGender((option as any).value);
              }}
            />
          </Col>
          <Col xs={6} sm={6} md={3} lg={2}>
            <YearSelector
              yearOptions={DateUtils.lboardYearList(tier)}
              selectedYear={year}
              onYearChange={(newYear) => setYear(newYear)}
              allowMultiYear={false}
            />
          </Col>
          <Col className="w-100" bsPrefix="d-lg-none d-md-none" />
          <Col xs={11} sm={11} md={6} lg={6}>
            <ConferenceSelector
              emptyLabel={`All Teams in ${tier} Tier${
                tier == "All" ? "s" : ""
              }`}
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
          <Col className="mt-1" xs={1}>
            {getCopyLinkButton()}
          </Col>
        </Form.Group>
        <Form.Row>
          <Form.Group as={Col} xs={10}>
            <InputGroup>
              <InputGroup.Prepend>
                <InputGroup.Text id="filter">Filter</InputGroup.Text>
              </InputGroup.Prepend>
              <AsyncFormControl
                startingVal={filterStr}
                onChange={(t: string) =>
                  friendlyChange(() => setFilterStr(t), t != filterStr)
                }
                timeout={500}
                placeholder="eg TeamA;-TeamB;Player1Code;Player2FirstName;-Player3Surname"
              />
            </InputGroup>
          </Form.Group>
          <Form.Group as={Col} xs={1} className="pl-4">
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
              <Dropdown.Divider />
              {
                // Users should click to the details link to get things like this
                // <GenericTogglingMenuItem
                //   text="Show Luck Adjustment diagnostics"
                //   truthVal={showLuckAdjDiags}
                //   onSelect={() => setShowLuckAdjDiags(!showLuckAdjDiags)}
                // />
              }
              {
                //TODO: add filtered download
              }
              {year != "All" &&
              year >= DateUtils.firstYearWithImprovedLineupLboards ? (
                <>
                  <GenericTogglingMenuItem
                    text={
                      <span>
                        <FontAwesomeIcon icon={faClipboard} />
                        {"  "}Export all lineups to CSV
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
                        {"  "}Export all lineups to CSV
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
                        link.download = "all_lineup_stats.csv";
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                        setLoadingOverride(false);
                      }, true);
                    }}
                  />
                  <Dropdown.Divider />
                </>
              ) : null}
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
            </GenericTogglingMenu>
          </Form.Group>
        </Form.Row>
        <Form.Row>
          <Form.Group as={Col} xs={3}>
            <InputGroup>
              <InputGroup.Prepend>
                <InputGroup.Text id="maxLineups">Max Lineups</InputGroup.Text>
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
          <Form.Group as={Col} xs={3}>
            <InputGroup>
              <InputGroup.Prepend>
                <InputGroup.Text id="minPossessions">
                  Min Poss #
                </InputGroup.Text>
              </InputGroup.Prepend>
              <AsyncFormControl
                startingVal={startingMinPoss}
                validate={(t: string) => t.match("^[0-9]*$") != null}
                onChange={(t: string) =>
                  friendlyChange(() => setMinPoss(t), t != minPoss)
                }
                timeout={400}
                placeholder="eg 20"
              />
            </InputGroup>
          </Form.Group>
          <Form.Group as={Col} xs={6}>
            <InputGroup>
              <InputGroup.Prepend>
                <InputGroup.Text id="sortBy">Sort By</InputGroup.Text>
              </InputGroup.Prepend>
              <ThemedSelect
                className="w-75"
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
        </Form.Row>
        <Form.Row>
          <Col xs={12} sm={12} md={12} lg={8}>
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
                    label: "T100",
                    tooltip: "Leaderboard of lineups vs T100 opposition",
                    toggled: isT100,
                    onClick: () =>
                      friendlyChange(() => {
                        setIsT100(!isT100);
                        setIsConfOnly(false);
                      }, true),
                  },
                  {
                    label: "Conf",
                    tooltip: "Leaderboard of lineups vs conference opposition",
                    toggled: isConfOnly,
                    onClick: () =>
                      friendlyChange(() => {
                        setIsT100(false);
                        setIsConfOnly(!isConfOnly);
                      }, true),
                  },
                ] as Array<any>
              )
                .concat(
                  showHelp
                    ? [
                        {
                          label: (
                            <a
                              href="https://hoop-explorer.blogspot.com/2020/07/understanding-lineup-analyzer-page.html"
                              target="_blank"
                            >
                              ?
                            </a>
                          ),
                          tooltip:
                            "Open a page that explains some of the elements of this table",
                          toggled: false,
                          onClick: () => {},
                        },
                      ]
                    : []
                )
                .concat([
                  {
                    label: "| Filters: ",
                    tooltip:
                      "Filter lineups based on their positional attributes",
                    toggled: true,
                    onClick: () => {},
                    isLabelOnly: true,
                  },
                  {
                    label: "0-PG",
                    tooltip: "Lineups without a true PG",
                    toggled: lineupFilters.has("0-PG"),
                    onClick: () =>
                      friendlyChange(() => {
                        toggleLineupFilters("0-PG");
                      }, true),
                  },
                  {
                    label: "2-PG",
                    tooltip: "Lineups with two primary ball-handlers",
                    toggled: lineupFilters.has("2-PG"),
                    onClick: () =>
                      friendlyChange(() => {
                        toggleLineupFilters("2-PG");
                      }, true),
                  },
                  {
                    label: "4-G",
                    tooltip: "4-Guard lineups only",
                    toggled: lineupFilters.has("4-G"),
                    onClick: () =>
                      friendlyChange(() => {
                        toggleLineupFilters("4-G");
                      }, true),
                  },
                  {
                    label: "5-out",
                    tooltip: "Lineups with a smallball center or 5-out",
                    toggled: lineupFilters.has("5-Out"),
                    onClick: () =>
                      friendlyChange(() => {
                        toggleLineupFilters("5-Out");
                      }, true),
                  },
                  {
                    label: "2-Big",
                    tooltip: "2-Big lineups only",
                    toggled: lineupFilters.has("2-Big"),
                    onClick: () =>
                      friendlyChange(() => {
                        toggleLineupFilters("2-Big");
                      }, true),
                  },
                  {
                    label: "x",
                    tooltip: "Clear all positional filters",
                    toggled: false,
                    onClick: () =>
                      friendlyChange(() => {
                        setLineupFilters(new Set());
                      }, true),
                  },
                ])}
            />
          </Col>
          <Col xs={12} sm={12} md={12} lg={4}>
            <div className="float-right">
              <small>
                (Qualifying lineups {tier == "All" ? "" : "in tier "}:{" "}
                <b>{dataEvent?.lineups?.length || 0}</b>)
              </small>
            </div>
          </Col>
        </Form.Row>
        <Row className="mt-2">
          <Col style={{ paddingLeft: "5px", paddingRight: "5px" }}>{table}</Col>
        </Row>
      </LoadingOverlay>
    </Container>
  );
};

export default LineupLeaderboardTable;
