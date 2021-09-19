import renderer from 'react-test-renderer';
import React from 'react';

import { OnOffReportDiagUtils } from '../../../utils/tables/OnOffReportDiagUtils';
import { LineupUtils } from "../../../utils/stats/LineupUtils";
import { sampleLineupStatsResponse } from "../../../sample-data/sampleLineupStatsResponse"

import RepOnOffDiagView from "../RepOnOffDiagView";
import { LineupStatSet } from '../../../utils/StatModels';

describe("RepOnOffDiagView", () => {

  const lineupReport = {
    lineups: sampleLineupStatsResponse.responses[0].aggregations.lineups.buckets as LineupStatSet[],
    avgEff: 100.0,
    error_code: "test"
  };
  const tempTeamReport = LineupUtils.lineupToTeamReport(
    lineupReport, true, 100, 10
  );
  const playersWithAdjEff = tempTeamReport.players || [];
  const diagInfo = OnOffReportDiagUtils.getRepOnOffDiagInfo(playersWithAdjEff[2], 100);

  [ true, false ].forEach((expandedMode) => {
    const threshold = expandedMode ? 0 : undefined; //test both with default threshold and with 0
    test(`RepOnOffDiagView - should create snapshot (expanded mode=[${expandedMode}], threshold=[${threshold}])`, () => {
      const component = renderer.create(<RepOnOffDiagView
        diagInfo={diagInfo || []}
        player={playersWithAdjEff?.[0]}
        playerMap={{"AaWiggins": "Wiggins, Aaron"}}
        expandedMode={expandedMode}
        commonParams={{baseQuery: "test"}}
        onExpand={(playerId: string) => false}
        showHelp={true}
        keyLineupThreshold={threshold}
      />);

      const tree = component.toJSON();
      expect(tree).toMatchSnapshot();
    });
  });
});
