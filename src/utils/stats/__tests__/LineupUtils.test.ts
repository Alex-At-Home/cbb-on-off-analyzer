

import _ from 'lodash';

import { LineupUtils } from "../LineupUtils";
import { LuckUtils } from "../LuckUtils";
import { GameFilterParams, LineupFilterParams, TeamReportFilterParams } from "../../FilterModels";
import { LineupStatSet } from "../../StatModels";
import { sampleLineupStatsResponse } from "../../../sample-data/sampleLineupStatsResponse";
//import { LineupStatsModel } from '../../../components/LineupStatsTable';

describe("LineupUtils", () => {

  /** Inject old_values everywhere to test the calcs */
  const insertOldValues = (mutableLineup: any) => {
     _.toPairs(mutableLineup as Record<string, any>).forEach(([ key, stat ]: [string, any]) => {
      if (LuckUtils.affectedFieldSet.has(key) && !_.isNil(stat.value)) {
        stat.old_value = stat.value;
        stat.override = "Test override";
      }
    });
    return mutableLineup;
  };

  const lineupReport = {
    lineups: (
        (sampleLineupStatsResponse.responses[0].aggregations.lineups.buckets || []) as LineupStatSet[]
      ).map(insertOldValues)
    ,
    avgOff: 100.0,
    error_code: "test"
  };
  const toFixed = (obj: any) => {

    if (obj?.override) { return {
        value: obj.value.toFixed(3),
        old_value: obj.old_value.toFixed(3),
        override: obj.override
      };
    } else {
      return obj.hasOwnProperty("value") ? {
        value: obj.value.toFixed(3)
      } : obj
    }
  };

  test("LineupUtils - calculateAggregatedLineupStats", () => {
    (lineupReport.lineups[1] as any).rapmRemove = true; //ignore the 2nd element
    const res = LineupUtils.calculateAggregatedLineupStats(lineupReport.lineups);
    expect(_.chain(res).pick([
      "off_poss", "def_poss", "off_adj_ppp", "def_adj_ppp"
    ]).mapValues(toFixed).value()).toMatchSnapshot();
  });
  test("LineupUtils - lineupToTeamReport", () => {

    [ 0, 10 ].forEach((diagMode) => {
      [ 0, 100 -100, -500 ].forEach((regressDiffs) => {
        [ false, true ].forEach((incOnOff) => {

          const onOffReport = LineupUtils.lineupToTeamReport(lineupReport, incOnOff, regressDiffs, diagMode);

          const playerList = _.chain(onOffReport.players || []).flatMap((onOff) => {
            return [ onOff.on.key, onOff.off.key ];
          }).sortBy().value();

          const replacementPlayerList = _.chain(onOffReport.players || []).flatMap((onOff) => {
            return [ onOff?.replacement?.key ];
          }).filter((k) => !_.isUndefined(k)).sortBy().value();

          // Check list of expected players
          expect(playerList).toEqual(
            [
              "'Off' Ayala, Eric", //1,2
              "'Off' Cowan, Anthony", //1,2,3
              "'Off' Morsell, Darryl", //1,3
              "'Off' Scott, Donta", //2,3
              "'Off' Smith, Jalen", //1,2
              "'Off' Wiggins, Aaron", //1,2,3
              "'On' Ayala, Eric",
              "'On' Cowan, Anthony",
              "'On' Morsell, Darryl",
              "'On' Scott, Donta",
              "'On' Smith, Jalen",
              "'On' Wiggins, Aaron",
            ]
          );
          expect(replacementPlayerList).toEqual(
            incOnOff ? [
              "'r:On-Off' Ayala, Eric",
              "'r:On-Off' Cowan, Anthony",
              "'r:On-Off' Morsell, Darryl",
              "'r:On-Off' Scott, Donta",
              "'r:On-Off' Smith, Jalen",
              "'r:On-Off' Wiggins, Aaron",
            ]: []
          );

          // Check Wiggins "OFF" values are zero'd

          const onOnlyOffVals = _.chain(onOffReport.players).filter((p) => {
            return p.off.key == "'Off' Wiggins, Aaron";
          }).map((p) => p.off).flatMap((off) => {
            return _.chain(off).toPairs().filter((kv) => {
              return !_.isObject(kv[1]) || ((kv[1] as any).value != 0)
            }).value();
          }).fromPairs().value();

          expect(onOnlyOffVals).toEqual({ key: "'Off' Wiggins, Aaron" }); //(all vals are 0)

          // Spot check some values

          const someOnOffVals = _.chain(onOffReport.players).filter((p) => {
            return p.on.key == "'On' Ayala, Eric";
          }).flatMap((p) => [ p.on, p.off, p.replacement ]).map((onOrOff) => {
            return _.chain(onOrOff || {}).pick([
              "key", "off_poss", "def_poss",
              "off_ppp", "def_ppp", "off_adj_opp", "def_adj_opp",
              "def_2prim", "def_2primr",
              "off_ft",
              "off_orb", "def_orb", "off_ftr",
              //^(note FTR has a different implementation because you can have lineups with FTs but no FGAs
              // this is not currently tested here, except by inspection on real data)
              "total_off_fga",
              "total_off_pts", "doc_count", "player_array", // (these are all ignored)
              "duration_mins", // should be summed
              "total_off_trans_poss", "off_scramble_ppp" // special cases
            ]).mapValues(toFixed).value();
          }).value();

          // Check build diagnostics when required
          if ((diagMode > 0) && (incOnOff)) {
            const same4Lineups = _.chain(onOffReport.players).filter((p) => {
              return p.on.key == "'On' Ayala, Eric";
            }).flatMap((p) => (p.replacement?.myLineups || []).map((l: any) => l.key)).value();
            expect(same4Lineups).toEqual(
              ["AaWiggins_AnCowan_DaMorsell_ErAyala_JaSmith", "AaWiggins_AnCowan_DoScott_ErAyala_JaSmith"]
            );
          }

          const regressed = (regress: number, val0: string, valBy: string, valTo: string) => {
            if (regress > 0) {
              return valBy;
            } else if (regress < 0) {
              if (regress > -200) {
                return val0;
              } else {
                return valTo;
              }
            } else {
              return val0;
            }
          };

          const totalOffPoss = 196 + 102;
          const totalDefPoss = 189 + 97;
          const totalOffFga = 167 + 96;
          const totalDefFga = 158 + 93;
          const offOrbAllowed = 39 + 21;
          const offDrbAllowed = 90 + 43;
          const defOrbAllowed = 19 + 27;
          const defDrbAllowed = 68 + 36;
          expect(someOnOffVals).toMatchSnapshot(`diagMode=[${diagMode}] regressDiffs=[${regressDiffs}] incOnOff=[${incOnOff}]`);

          // Check roster

          const lineupComp = _.chain(onOffReport.players).filter((p) => {
            return p.on.key == "'On' Ayala, Eric";
          }).map((p) => _.pick(p.teammates, [ 'Cowan, Anthony' ])).value();

          expect(lineupComp).toEqual([
            { "Cowan, Anthony": {
              on: { off_poss: 598, def_poss: 581 },
              off: { off_poss: 211, def_poss: 213 }
            }}
          ]);

          // Check empty lineup:

          const emptyReplacementOnOff = _.chain(onOffReport.players).filter((p) => {
            return p?.replacement?.key == "'r:On-Off' Wiggins, Aaron";
          }).map((p) => p?.replacement || {}).value();

          expect(emptyReplacementOnOff).toEqual(incOnOff ? [
            {
              key: "'r:On-Off' Wiggins, Aaron",
              lineupUsage: {},
              myLineups: diagMode > 0 ? [] : undefined
            }
          ] : []);

        });//(end loop over incOnOff)
      });//(end loop over regress diffs)
    });//(end loop over diag mode)
  });
  test("LineupUtils - gameGameInfo", () => {
    const testIn = {"doc_count_error_upper_bound":0,"sum_other_doc_count":0,
    "buckets":[
      {"key":"H:Nebraska","doc_count":6,"game_info":{
        "buckets":[
          {"key_as_string":"2021-02-16T12:00:00.000-10:00","key":1613512800000,"doc_count":2,"num_pts_for":{"value":14},"num_off_poss":{"value":15},"num_pts_against":{"value":10},"num_def_poss":{"value":14}},
          {"key_as_string":"2021-02-17T00:00:00.000-10:00","key":1613556000000,"doc_count":0,"num_pts_for":{"value":0},"num_off_poss":{"value":0},"num_pts_against":{"value":0},"num_def_poss":{"value":0}},
          {"key_as_string":"2021-02-17T12:00:00.000-10:00","key":1613599200000,"doc_count":0,"num_pts_for":{"value":0},"num_off_poss":{"value":0},"num_pts_against":{"value":0},"num_def_poss":{"value":0}},
          {"key_as_string":"2021-02-18T00:00:00.000-10:00","key":1613642400000,"doc_count":0,"num_pts_for":{"value":0},"num_off_poss":{"value":0},"num_pts_against":{"value":0},"num_def_poss":{"value":0}},
          {"key_as_string":"2021-02-18T12:00:00.000-10:00","key":1613685600000,"doc_count":4,"num_pts_for":{"value":30},"num_off_poss":{"value":19},"num_pts_against":{"value":23},"num_def_poss":{"value":19}}]}},
      {"key":"A:Penn St.","doc_count":4,"game_info":{
        "buckets":[
            {"key_as_string":"2021-02-05T12:00:00.000-10:00","key":1612562400000,"doc_count":4,"num_pts_for":{"value":12},"num_off_poss":{"value":16},"num_pts_against":{"value":12},"num_def_poss":{"value":14}}]}},
      {"key":"H:Minnesota","doc_count":3,"game_info":{
        "buckets":[
          {"key_as_string":"2021-02-14T12:00:00.000-10:00","key":1613340000000,"doc_count":3,"num_pts_for":{"value":15},"num_off_poss":{"value":14},"num_pts_against":{"value":6},"num_def_poss":{"value":14}}]}},
      {"key":"H:Purdue","doc_count":3,"game_info":{
        "buckets":[{"key_as_string":"2021-02-02T12:00:00.000-10:00","key":1612303200000,"doc_count":3,"num_pts_for":{"value":23},"num_off_poss":{"value":18},"num_pts_against":{"value":20},"num_def_poss":{"value":17}}]}}]};

    const mutableOpponents = {};
    const results = LineupUtils.getGameInfo(testIn, mutableOpponents);
    //expect(results).toBe([]);
    expect(results).toMatchSnapshot();
    //expect(mutableOpponents).toBe({});
    expect(mutableOpponents).toMatchSnapshot();
  });
});
