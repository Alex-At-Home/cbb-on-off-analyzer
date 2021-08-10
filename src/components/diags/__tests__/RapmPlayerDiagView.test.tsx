import renderer from 'react-test-renderer';
import React from 'react';
import RapmPlayerDiagView from '../RapmPlayerDiagView';

// Needed to build the data
import { sampleLineupStatsResponse } from "../../../sample-data/sampleLineupStatsResponse";
import { LineupUtils } from "../../../utils/stats/LineupUtils";
import { RapmUtils } from "../../../utils/stats/RapmUtils";
import { semiRealRapmResults } from "../../../utils/stats/__tests__/RapmUtils.test";
import { StatModels, LineupStatSet, IndivStatSet, TeamStatSet } from "../../../../utils/StatModels";

describe("RapmPlayerDiagView", () => {

  const lineupReport = {
    lineups: sampleLineupStatsResponse.responses[0].aggregations.lineups.buckets as LineupStatSet[],
    avgEff: 100.0,
    error_code: "test"
  };
  const globalRapmDiagRef = React.createRef<HTMLDivElement>();

  test("RapmPlayerDiagView - should create snapshot", () => {
    const [ offResults, defResults ] = RapmUtils.pickRidgeRegression(
      semiRealRapmResults.testOffWeights, semiRealRapmResults.testDefWeights, semiRealRapmResults.testContext, undefined, true
    );
    const onOffReport = LineupUtils.lineupToTeamReport(lineupReport);

    RapmUtils.injectRapmIntoPlayers(
      onOffReport.players || [], offResults, defResults, {}, semiRealRapmResults.testContext, undefined
    );
    const rapmInfo = {
      enrichedPlayers: [],
      ctx: semiRealRapmResults.testContext,
      preProcDiags: RapmUtils.calcCollinearityDiag(
        semiRealRapmResults.testOffWeights, semiRealRapmResults.testContext
      ),
      offWeights: semiRealRapmResults.testOffWeights,
      defWeights: semiRealRapmResults.testDefWeights,
      offInputs: offResults,
      defInputs: defResults
    };

    const component = renderer.create(<RapmPlayerDiagView
      globalRef={globalRapmDiagRef}
      rapmInfo={rapmInfo}
      player={onOffReport.players![0]!}
    />);

    const tree = component.toJSON();
    expect(tree).toMatchSnapshot();
  });
});
