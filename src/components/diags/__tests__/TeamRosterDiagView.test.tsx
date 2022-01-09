import React from 'react';
import _ from 'lodash';
import TeamRosterDiagView from '../TeamRosterDiagView';
import { SampleDataUtils } from "../../../sample-data/SampleDataUtils";
import { samplePlayerStatsResponse } from "../../../sample-data/samplePlayerStatsResponse";
import { sampleTeamStatsResponse } from "../../../sample-data/sampleTeamStatsResponse";
import { sampleLineupStatsResponse } from "../../../sample-data/sampleLineupStatsResponse";
import { LineupTableUtils } from "../../../utils/tables/LineupTableUtils";
import { RosterTableUtils } from "../../../utils/tables/RosterTableUtils";
import { shallow } from 'enzyme'
import toJson from 'enzyme-to-json'
import { IndivStatSet, LineupStatSet, StatModels, TeamStatSet } from '../../../utils/StatModels';

describe("TeamRosterDiagView", () => {
  // Tidy up snapshot rendering:
  expect.addSnapshotSerializer(SampleDataUtils.summarizeEnrichedApiResponse(
    samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets?.on?.player?.buckets?.[0]
  ));
  const testData = {
    on: samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets?.on?.player?.buckets as unknown as IndivStatSet[],
    off: samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets?.off?.player?.buckets as unknown as IndivStatSet[],
    baseline: samplePlayerStatsResponse.responses[0].aggregations?.tri_filter?.buckets?.baseline?.player?.buckets as unknown as IndivStatSet[],
    error_code: undefined
  };
  const teamData = _.assign(
    sampleTeamStatsResponse.responses[0].aggregations.tri_filter.buckets as { on: TeamStatSet, off: TeamStatSet, baseline: TeamStatSet },
    { global: StatModels.emptyTeam(), onOffMode: true }
  );
  const testLineupData = {
    lineups: sampleLineupStatsResponse.responses[0].aggregations.lineups.buckets as LineupStatSet[]
  }
  const teamSeasonLookup = "Men_Maryland_2018/9";
  const rosterStatsByCode = RosterTableUtils.buildRosterTableByCode(testData.on, undefined, true, teamSeasonLookup);
  const positionFromPlayerIdGlobal = _.chain(testData.baseline).map(p => { //inject pos class into data
    const player = p.player_array?.hits?.hits?.[0]?._source?.player;
    const code = player?.code;
    const key = player?.id || "unknown";
    return [ key, {
      ...p,
      posClass: code ? rosterStatsByCode[code]?.posClass || "WG" : "WG"
    } ];
  }).fromPairs().value();
  const positionFromPlayerIdSample = _.chain(testData.off).map(p => { //inject pos class into data
    const player = p.player_array?.hits?.hits?.[0]?._source?.player;
    const code = player?.code;
    const key = player?.id || "unknown";
    return [ key, {
      ...p,
      posClass: code ? rosterStatsByCode[code]?.posClass || "WG" : "WG"
    } ];
  }).fromPairs().value();
  const rosterStatsById = LineupTableUtils.buildBaselinePlayerInfo(
    testData.on as unknown as Array<IndivStatSet>, rosterStatsByCode, teamData.on, 100.0, true, "season" //(adjust for luck in this scenario, arbitrarily)
  );
  test("TeamRosterDiagView - global only", () => {
    const wrapper = shallow(
      <TeamRosterDiagView
        positionInfoGlobal={LineupTableUtils.getPositionalInfo(
          (testLineupData.lineups || []) as unknown as Array<LineupStatSet>, positionFromPlayerIdGlobal, teamSeasonLookup
        )}
        positionInfoSample={undefined}
        rosterStatsByPlayerId={rosterStatsById}
        positionFromPlayerId={positionFromPlayerIdGlobal}
        teamSeasonLookup={teamSeasonLookup}
        showHelp={true}
      />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });
  test("TeamRosterDiagView - global and sample - choose baseline", () => {
    const wrapper = shallow(
      <TeamRosterDiagView
        positionInfoGlobal={LineupTableUtils.getPositionalInfo(
          (testLineupData.lineups || []) as unknown as Array<LineupStatSet>, positionFromPlayerIdGlobal, teamSeasonLookup
        )}
        positionInfoSample={LineupTableUtils.getPositionalInfo(
          _.take(testLineupData.lineups || [], 1) as unknown as Array<LineupStatSet>, positionFromPlayerIdSample, teamSeasonLookup
        )}
        rosterStatsByPlayerId={rosterStatsById}
        positionFromPlayerId={positionFromPlayerIdGlobal}
        teamSeasonLookup={teamSeasonLookup}
        showHelp={true}
      />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });
  test("TeamRosterDiagView - global and sample - choose sample", () => {
    const wrapper = shallow(
      <TeamRosterDiagView
        positionInfoGlobal={LineupTableUtils.getPositionalInfo(
          (testLineupData.lineups || []) as unknown as Array<LineupStatSet>, positionFromPlayerIdGlobal, teamSeasonLookup
        )}
        positionInfoSample={LineupTableUtils.getPositionalInfo(
          _.take(testLineupData.lineups || [], 1) as unknown as Array<LineupStatSet>, positionFromPlayerIdSample, teamSeasonLookup
        )}
        rosterStatsByPlayerId={rosterStatsById}
        positionFromPlayerId={positionFromPlayerIdGlobal}
        teamSeasonLookup={teamSeasonLookup}
        showHelp={true}
        useSampleStatsOverride={true}
      />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });
});
