import renderer from 'react-test-renderer';
import React from 'react';
import RosterCompareTable from '../RosterCompareTable';
import { sampleRosterCompareResponse } from "../../sample-data/sampleRosterCompareResponse"

describe("RosterCompareTable", () => {
  test("RosterCompareTable - should create snapshot", () => {
    const gameFilterTestData = {};
    const testData = sampleRosterCompareResponse.aggregations.tri_filter.buckets;
    const component = renderer.create(<RosterCompareTable gameFilterParams={gameFilterTestData} rosterCompareStats={testData} />);
    const tree = component.toJSON();
    expect(tree).toMatchSnapshot();
  });
});
