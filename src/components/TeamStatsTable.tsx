// React imports:
import React, { useState, useEffect } from 'react';

// Next imports:
import { NextPage } from 'next';

// Lodash:
import _ from "lodash";

// Bootstrap imports:
import 'bootstrap/dist/css/bootstrap.min.css';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Dropdown from 'react-bootstrap/Dropdown';

// Additional components:
// @ts-ignore
import LoadingOverlay from 'react-loading-overlay';

// Component imports
import GenericTable, { GenericTableOps, GenericTableColProps } from "./GenericTable"
import { RosterStatsModel } from './RosterStatsTable';
import { LineupStatsModel } from './LineupStatsTable';
import LuckConfigModal from "./shared/LuckConfigModal";
import GenericTogglingMenu from "./shared/GenericTogglingMenu";
import GenericTogglingMenuItem from "./shared/GenericTogglingMenuItem";
import ToggleButtonGroup from "./shared/ToggleButtonGroup";
import LuckAdjDiagView from "./diags/LuckAdjDiagView";
import TeamPlayTypeDiagView from "./diags/TeamPlayTypeDiagView";

// Util imports
import { CbbColors } from "../utils/CbbColors";
import { GameFilterParams, ParamDefaults, LuckParams } from "../utils/FilterModels";
import { CommonTableDefs } from "../utils/tables/CommonTableDefs";
import { LineupUtils } from "../utils/stats/LineupUtils";
import { LuckUtils, OffLuckAdjustmentDiags, DefLuckAdjustmentDiags, LuckAdjustmentBaseline } from "../utils/stats/LuckUtils";
import { efficiencyAverages } from '../utils/public-data/efficiencyAverages';
import { TableDisplayUtils } from "../utils/tables/TableDisplayUtils";
import { RosterTableUtils } from "../utils/tables/RosterTableUtils";

export type TeamStatsModel = {
  on: any,
  off: any,
  baseline: any,
  global: any, //(a subest of the fields, across all samples for the team)
  onOffMode: boolean,
  error_code?: string
}
type Props = {
  gameFilterParams: GameFilterParams;
  /** Ensures that all relevant data is received at the same time */
  dataEvent: {
    teamStats: TeamStatsModel,
    rosterStats: RosterStatsModel,
    lineupStats: LineupStatsModel[]
  },
  onChangeState: (newParams: GameFilterParams) => void;
}

const TeamStatsTable: React.FunctionComponent<Props> = ({gameFilterParams, dataEvent, onChangeState}) => {
  const { teamStats, rosterStats } = dataEvent;

  const server = (typeof window === `undefined`) ? //(ensures SSR code still compiles)
    "server" : window.location.hostname

  /** Only show help for diagnstic on/off on main page */
  const showHelp = !_.startsWith(server, "cbb-on-off-analyzer");

  // 1] Data Model

  const [ adjustForLuck, setAdjustForLuck ] = useState(_.isNil(gameFilterParams.onOffLuck) ?
    ParamDefaults.defaultOnOffLuckAdjust : gameFilterParams.onOffLuck
  );
  const [ showLuckAdjDiags, setShowLuckAdjDiags ] = useState(_.isNil(gameFilterParams.showOnOffLuckDiags) ?
    ParamDefaults.defaultOnOffLuckDiagMode : gameFilterParams.showOnOffLuckDiags
  );
  const [ luckConfig, setLuckConfig ] = useState(_.isNil(gameFilterParams.luck) ?
    ParamDefaults.defaultLuckConfig : gameFilterParams.luck
  );

  const [ showLineups, setShowLineups ] = useState(_.isNil(gameFilterParams.showLineups) ?
    ParamDefaults.defaultTeamShowLineups : gameFilterParams.showLineups
  );

  const [ showDiffs, setShowDiffs ] = useState(_.isNil(gameFilterParams.teamDiffs) ?
    false : gameFilterParams.teamDiffs
  );

  /** (placeholder for positional info)*/
  const [ showPlayTypes, setShowPlayTypes ] = useState(_.isNil(gameFilterParams.showTeamPlayTypes) ?
    ParamDefaults.defaultTeamShowPlayTypes : gameFilterParams.showTeamPlayTypes
  );

  /** Whether we are showing the luck config modal */
  const [ showLuckConfig, setShowLuckConfig ] = useState(false);

  useEffect(() => { //(keep luck up to date between the two views)
    setAdjustForLuck(_.isNil(gameFilterParams.onOffLuck) ?
        ParamDefaults.defaultOnOffLuckAdjust : gameFilterParams.onOffLuck
    );
    setLuckConfig(_.isNil(gameFilterParams.luck) ?
      ParamDefaults.defaultLuckConfig : gameFilterParams.luck
    );
  }, [ gameFilterParams ]);

  useEffect(() => { //(this ensures that the filter component is up to date with the union of these fields)
    const newState = {
      ...gameFilterParams,
      teamDiffs: showDiffs,
      showTeamPlayTypes: showPlayTypes,
      luck: luckConfig,
      onOffLuck: adjustForLuck,
      showOnOffLuckDiags: showLuckAdjDiags,
      showLineups: showLineups
    };
    onChangeState(newState);
  }, [ luckConfig, adjustForLuck, showLuckAdjDiags, showDiffs, showPlayTypes, showLineups ]);

  // 2] Data View

  const offPrefixFn = (key: string) => "off_" + key;
  const offCellMetaFn = (key: string, val: any) => "off";
  const defPrefixFn = (key: string) => "def_" + key;
  const defCellMetaFn = (key: string, val: any) => "def";

  const maybeOn = teamStats.onOffMode ? "On ('A')" : "'A'"
  const maybeOff = teamStats.onOffMode ? "Off ('B')" : "'B'"

  // Luck calculations:

  const genderYearLookup = `${gameFilterParams.gender}_${gameFilterParams.year}`;
  const teamSeasonLookup = `${gameFilterParams.gender}_${gameFilterParams.team}_${gameFilterParams.year}`;
  const avgEfficiency = efficiencyAverages[genderYearLookup] || efficiencyAverages.fallback;

  // The luck baseline can either be the user-selecteed baseline or the entire season
  const [ baseOrSeasonTeamStats, baseOrSeason3PMap ] = (() => {
    if (adjustForLuck) {
      switch (luckConfig.base) {
        case "baseline":
          return [
            teamStats.baseline, _.fromPairs((rosterStats.baseline || []).map((p: any) => [ p.key, p ]))
          ];
        default: //("season")
          return [
            teamStats.global, _.fromPairs((rosterStats.global || []).map((p: any) => [ p.key, p ]))
          ];
      }
    } else return [ {}, {} ]; //(not used)
  })();

  // Create luck adjustments, inject luck into mutable stat sets, and calculate efficiency margins
  type OnOffBase = "on" | "off" | "baseline";
  const luckAdjustment = _.fromPairs(([ "on", "off", "baseline" ] as OnOffBase[]).map(k => {
    const luckAdj = (adjustForLuck && teamStats[k]?.doc_count) ? [
      LuckUtils.calcOffTeamLuckAdj(teamStats[k], rosterStats[k] || [], baseOrSeasonTeamStats, baseOrSeason3PMap, avgEfficiency),
      LuckUtils.calcDefTeamLuckAdj(teamStats[k], baseOrSeasonTeamStats, avgEfficiency),
    ] as [OffLuckAdjustmentDiags, DefLuckAdjustmentDiags] : undefined;

    if (teamStats[k]?.doc_count) {
      // Extra mutable set, build net margin column:
      LineupUtils.buildEfficiencyMargins(teamStats[k]);
      // Mutate stats object to inject luck
      LuckUtils.injectLuck(teamStats[k], luckAdj?.[0], luckAdj?.[1]);
    }
    return [ k, luckAdj ];
  })) as {
    [P in OnOffBase]: [ OffLuckAdjustmentDiags, DefLuckAdjustmentDiags ] | undefined
  };

  //(end luck calcs)

  /** Largest sample of player stats, by player key - use for ORtg calcs */
  const globalRosterStatsByCode = RosterTableUtils.buildRosterTableByCode(
    rosterStats.global || [], showPlayTypes, teamSeasonLookup
  ); //TODO: which set do I actually want to use for positional calcs here?

  // Calc diffs if required ... needs to be before injectPlayTypeInfo but after luck injection!
  const [ aMinusB, aMinusBase, bMinusBase ] = showDiffs ? (() => {
    const aMinusB = (teamStats.on?.doc_count && teamStats.off?.doc_count) ? LineupUtils.getStatsDiff(
      teamStats.on, teamStats.off, "A - B diffs"
    ) : undefined;
    const aMinusBase = (teamStats.on?.doc_count && teamStats.baseline?.doc_count) ? LineupUtils.getStatsDiff(
      teamStats.on, teamStats.baseline, "A - Baseline diffs"
    ) : undefined;
    const bMinusBase = (teamStats.off?.doc_count && teamStats.baseline?.doc_count) ? LineupUtils.getStatsDiff(
      teamStats.off, teamStats.baseline,  "B - Baseline diffs"
    ) : undefined;

    [ aMinusB, aMinusBase, bMinusBase ].forEach((statSet) => {
      if (statSet) TableDisplayUtils.injectPlayTypeInfo(statSet, false, false, teamSeasonLookup)
    });
    return [ aMinusB, aMinusBase, bMinusBase ];
  })() : [ undefined, undefined, undefined ] as [ any, any, any ];

  ([ "on", "off", "baseline" ] as OnOffBase[]).forEach(k => {
    TableDisplayUtils.injectPlayTypeInfo(teamStats[k], false, false, teamSeasonLookup);
  });

  // Last stage before building the table: inject titles into the stats:
  const teamStatsOn = {
    off_title: `${maybeOn} Offense`,
    def_title: `${maybeOn} Defense`,
    ...teamStats.on
  };
  const teamStatsOff = {
    off_title: `${maybeOff} Offense`,
    def_title: `${maybeOff} Defense`,
    ...teamStats.off
  };
  const teamStatsBaseline = { off_title: "Baseline Offense", def_title: "Baseline Defense", ...teamStats.baseline };

  const tableData = _.flatMap([
    (teamStats.on?.doc_count) ? _.flatten([
      [ GenericTableOps.buildDataRow(teamStatsOn, offPrefixFn, offCellMetaFn) ],
      [ GenericTableOps.buildDataRow(teamStatsOn, defPrefixFn, defCellMetaFn) ],
      showLuckAdjDiags && luckAdjustment.on ? [ GenericTableOps.buildTextRow(
        <LuckAdjDiagView
          name="On"
          offLuck={luckAdjustment.on[0]}
          defLuck={luckAdjustment.on[1]}
          baseline={luckConfig.base}
          showHelp={showHelp}
        />, "small pt-2"
      ) ] : [] ,
      showPlayTypes ?
        [ GenericTableOps.buildTextRow(
          <TeamPlayTypeDiagView
            players={rosterStats.on || []}
            rosterStatsByCode={globalRosterStatsByCode}
            teamStats={teamStatsOn}
            teamSeasonLookup={teamSeasonLookup}
            showHelp={showHelp}
            />, "small"
        ) ] : [],
      [ GenericTableOps.buildRowSeparator() ]
    ]) : [],
    (teamStats.off?.doc_count) ? _.flatten([
      [ GenericTableOps.buildDataRow(teamStatsOff, offPrefixFn, offCellMetaFn) ],
      [ GenericTableOps.buildDataRow(teamStatsOff, defPrefixFn, defCellMetaFn) ],
      showLuckAdjDiags && luckAdjustment.off ? [ GenericTableOps.buildTextRow(
        <LuckAdjDiagView
          name="Off"
          offLuck={luckAdjustment.off[0]}
          defLuck={luckAdjustment.off[1]}
          baseline={luckConfig.base}
          showHelp={showHelp}
        />, "small pt-2"
      ) ] : [] ,
      showPlayTypes ?
        [ GenericTableOps.buildTextRow(
          <TeamPlayTypeDiagView
            players={rosterStats.off || []}
            rosterStatsByCode={globalRosterStatsByCode}
            teamStats={teamStatsOff}
            teamSeasonLookup={teamSeasonLookup}
            showHelp={showHelp}
            />, "small"
        ) ] : [],
      [ GenericTableOps.buildRowSeparator() ]
    ]) : [],
    _.flatten([
      [ GenericTableOps.buildDataRow(teamStatsBaseline, offPrefixFn, offCellMetaFn) ],
      [ GenericTableOps.buildDataRow(teamStatsBaseline, defPrefixFn, defCellMetaFn) ],
      showLuckAdjDiags && luckAdjustment.baseline ? [ GenericTableOps.buildTextRow(
        <LuckAdjDiagView
          name="Baseline"
          offLuck={luckAdjustment.baseline[0]}
          defLuck={luckAdjustment.baseline[1]}
          baseline={luckConfig.base}
          showHelp={showHelp}
        />, "small pt-2"
      ) ] : [] ,
      showPlayTypes ?
        [ GenericTableOps.buildTextRow(
          <TeamPlayTypeDiagView
            players={rosterStats.baseline || []}
            rosterStatsByCode={globalRosterStatsByCode}
            teamStats={teamStatsBaseline}
            teamSeasonLookup={teamSeasonLookup}
            showHelp={showHelp}
            />, "small"
        ) ] : [],
    ]),
    // Diffs if showing:
    showDiffs ? [ GenericTableOps.buildRowSeparator() ] : [],
    aMinusB ? _.flatten([
      [ GenericTableOps.buildDataRow(aMinusB, offPrefixFn, offCellMetaFn, CommonTableDefs.onOffReportReplacement) ],
      [ GenericTableOps.buildDataRow(aMinusB, defPrefixFn, defCellMetaFn, CommonTableDefs.onOffReportReplacement) ],
      [ GenericTableOps.buildRowSeparator() ],
    ] ) : [],
    aMinusBase ? _.flatten([
      [ GenericTableOps.buildDataRow(aMinusBase, offPrefixFn, offCellMetaFn, CommonTableDefs.onOffReportReplacement) ],
      [ GenericTableOps.buildDataRow(aMinusBase, defPrefixFn, defCellMetaFn, CommonTableDefs.onOffReportReplacement) ],
      [ GenericTableOps.buildRowSeparator() ],
    ] ) : [],
    bMinusBase ? _.flatten([
      [ GenericTableOps.buildDataRow(bMinusBase, offPrefixFn, offCellMetaFn, CommonTableDefs.onOffReportReplacement) ],
      [ GenericTableOps.buildDataRow(bMinusBase, defPrefixFn, defCellMetaFn, CommonTableDefs.onOffReportReplacement) ],
      [ GenericTableOps.buildRowSeparator() ],
    ] ) : [],
  ]);

  // 3] Utils
  /** Sticks an overlay on top of the table if no query has ever been loaded */
  function needToLoadQuery() {
    return (Object.keys(teamStats.on).length == 0) &&
      (Object.keys(teamStats.off).length == 0) &&
      (Object.keys(teamStats.baseline).length == 0);
  }

  // 4] View

  return <Container>
    <LoadingOverlay
      active={needToLoadQuery()}
      text={teamStats.error_code ?
        `Query Error: ${teamStats.error_code}` :
        "Press 'Submit' to view results"
      }
    >
      <LuckConfigModal
        show={showLuckConfig}
        onHide={() => setShowLuckConfig(false)}
        onSave={(l: LuckParams) => setLuckConfig(l)}
        luck={luckConfig}
        showHelp={showHelp}
      />
      <Form.Row>
        <Col sm="11">
          <Form.Row>
            <Col>
              <ToggleButtonGroup items={[
                {
                  label: "Luck",
                  tooltip: adjustForLuck ? "Remove luck adjustments" : "Adjust statistics for luck",
                  toggled: adjustForLuck,
                  onClick: () => setAdjustForLuck(!adjustForLuck)
                },
                {
                  label: "Diffs",
                  tooltip: "Show hide diffs between A/B/Baseline stats",
                  toggled: showDiffs,
                  onClick: () => setShowDiffs(!showDiffs)
                },
                {
                  label: "Style",
                  tooltip: showPlayTypes ? "Hide play style breakdowns" : "Show play style breakdowns",
                  toggled: showPlayTypes,
                  onClick: () => setShowPlayTypes(!showPlayTypes)
                },
                {
                  label: "Lineups",
                  tooltip: showLineups ? "Hide lineup information" : "Show lineup information",
                  toggled: showLineups,
                  onClick: () => setShowLineups(!showLineups)
                },
              ]}/>
            </Col>
          </Form.Row>
        </Col>
        <Form.Group as={Col} sm="1">
          <GenericTogglingMenu>
            <GenericTogglingMenuItem
              text="Adjust for Luck"
              truthVal={adjustForLuck}
              onSelect={() => setAdjustForLuck(!adjustForLuck)}
              helpLink={showHelp ? "https://hoop-explorer.blogspot.com/2020/07/luck-adjustment-details.html" : undefined}
            />
            <GenericTogglingMenuItem
              text="Show Stat Differences"
              truthVal={showDiffs}
              onSelect={() => setShowDiffs(!showDiffs)}
            />
            <GenericTogglingMenuItem
              text="Show Play Style Breakdowns"
              truthVal={showPlayTypes}
              onSelect={() => setShowPlayTypes(!showPlayTypes)}
            />
            <GenericTogglingMenuItem
              text="Show Lineup Information"
              truthVal={showLineups}
              onSelect={() => setShowLineups(!showLineups)}
            />
            <Dropdown.Divider />
            <GenericTogglingMenuItem
              text="Configure Luck Adjustments..."
              truthVal={false}
              onSelect={() => setShowLuckConfig(true)}
            />
            <Dropdown.Divider />
            <GenericTogglingMenuItem
              text="Show Luck Adjustment diagnostics"
              truthVal={showLuckAdjDiags}
              onSelect={() => setShowLuckAdjDiags(!showLuckAdjDiags)}
            />
          </GenericTogglingMenu>
        </Form.Group>
      </Form.Row>
      <Row className="mt-2">
        <Col style={{paddingLeft: "5px", paddingRight: "5px"}}>
          <GenericTable
            tableCopyId="teamStatsTable"
            tableFields={CommonTableDefs.onOffTable}
            tableData={tableData}
            cellTooltipMode="none"
          />
        </Col>
      </Row>
    </LoadingOverlay>
  </Container>;
};

export default TeamStatsTable;
