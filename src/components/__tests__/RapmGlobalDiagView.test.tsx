import renderer from 'react-test-renderer';
import React from 'react';
import RapmGlobalDiagView from '../RapmGlobalDiagView';

// Needed to build the data
import { sampleLineupStatsResponse } from "../../sample-data/sampleLineupStatsResponse";
import { LineupUtils } from "../../utils/LineupUtils";
import { RapmUtils } from "../../utils/RapmUtils";
import { semiRealRapmResults } from "../../utils/__tests__/RapmUtils.test";

describe("RapmGlobalDiagView", () => {

  const lineupReport = {
    lineups: sampleLineupStatsResponse.responses[0].aggregations.lineups.buckets,
    avgEff: 100.0,
    error_code: "test"
  };

  test("RapmGlobalDiagView - should create snapshot", () => {
    const [ offResults, defResults ] = RapmUtils.pickRidgeRegression(
      semiRealRapmResults.testOffWeights, semiRealRapmResults.testDefWeights, semiRealRapmResults.testContext);
    const onOffReport = LineupUtils.lineupToTeamReport(lineupReport);

    RapmUtils.injectRapmIntoPlayers(
      onOffReport.players || [], offResults, defResults, {}, semiRealRapmResults.testContext
    );
    const rapmInfo = {
      ctx: semiRealRapmResults.testContext,
      preProcDiags: RapmUtils.calcCollinearityDiag(
        semiRealRapmResults.testOffWeights, semiRealRapmResults.testContext
      ),
      noUnbiasWeightsDiags: RapmUtils.recalcNoUnbiasWeightingRapmForDiag(
        semiRealRapmResults.testOffWeights, semiRealRapmResults.testDefWeights,
        offResults, defResults, semiRealRapmResults.testContext
      ),
      offWeights: semiRealRapmResults.testOffWeights,
      defWeights: semiRealRapmResults.testDefWeights,
      offInputs: offResults,
      defInputs: defResults
    };

    const component = renderer.create(<RapmGlobalDiagView
      topRef={React.createRef<HTMLDivElement>()}
      rapmInfo={rapmInfo}
      players={onOffReport.players || []}
    />);

    const tree = component.toJSON();
    expect(tree).toMatchSnapshot();
  });
});