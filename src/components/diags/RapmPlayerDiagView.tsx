// React imports:
import React, { useState } from 'react';

import _ from "lodash";

// Next imports:
import { NextPage } from 'next';

// Utils
import { RapmInfo, RapmPlayerContext, RapmPreProcDiagnostics, RapmProcessingInputs, RapmUtils } from "../../utils/stats/RapmUtils";

type Props = {
  rapmInfo: RapmInfo,
  player: Record<string, any>,
  globalRef: React.RefObject<HTMLDivElement>
};

const RapmPlayerDiagView: React.FunctionComponent<Props> = (({rapmInfo, player, globalRef}) => {
  try {
    const ctx = rapmInfo.ctx;
    const offWeights = rapmInfo.offWeights.valueOf();
    const offInputs = rapmInfo.offInputs;
    const defInputs = rapmInfo.defInputs;

    const gotoGlobalDiags = () => {
      if (globalRef.current) {
        globalRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    };

    const rapmOff = (player.rapm?.off_adj_ppp?.value || 0);
    const rapmDef = (player.rapm?.def_adj_ppp?.value || 0);

    const col = ctx.playerToCol[player.playerId];

    const totalOffPoss = ctx.teamInfo?.off_poss?.value;
    const teamOffAdj = ((ctx.teamInfo.off_adj_ppp?.value || ctx.avgEfficiency) - ctx.avgEfficiency);
    const teamDefAdj = ((ctx.teamInfo.def_adj_ppp?.value || ctx.avgEfficiency) - ctx.avgEfficiency);

    const offPoss = offInputs.playerPossPcts[col]!;
    const defPoss = defInputs.playerPossPcts[col]!;
    const offPossPctStr = (100.0*(offInputs.playerPossPcts[col]!)).toFixed(0);

    // Prior (luck adjusted o/drtg)
    const offPrior = ctx.priorInfo.playersWeak?.[col]?.off_adj_ppp || 0;
    const defPrior = ctx.priorInfo.playersWeak?.[col]?.def_adj_ppp || 0;

    const offUnbiasRapm = offInputs.rapmRawAdjPpp[col];
    const defUnbiasRapm = defInputs.rapmRawAdjPpp[col];

    const buildPrior = (input: RapmProcessingInputs) => {
      const vec = input.rapmRawAdjPpp;
      return _.reduce(vec, (acc, n: number, i: number) => acc + n*input.playerPossPcts[i]!) || 0
    };
    const [ sigmaRapmOff, sigmaRapmDef ]  = [ buildPrior(offInputs), buildPrior(defInputs) ];
    const offPriorTotalDiff = teamOffAdj - sigmaRapmOff;
    const defPriorTotalDiff = teamDefAdj - sigmaRapmDef;
    const offPriorContrib = rapmOff - offUnbiasRapm;
    const defPriorContrib = rapmDef - defUnbiasRapm;

    const maybeAdaptiveWeight = rapmInfo?.preProcDiags?.adaptiveCorrelWeights?.[col] || 0.0;

    const detailedInfoPost = <ul>
      <li>We calculate a team adjustment (off=[<b>{offPriorTotalDiff.toFixed(2)}</b>] def=[<b>{defPriorTotalDiff.toFixed(2)}</b>]) to reduce/remove the
      the delta between total adjusted efficiency and RAPM (due to the regression factor): eg compare <em>observed</em> (off=[<b>{teamOffAdj.toFixed(2)}</b>] def=[<b>{teamDefAdj.toFixed(2)}</b>])
      vs <em>derived solely from RAPM</em> (off=[<b>{sigmaRapmOff.toFixed(2)}</b>] def=[<b>{sigmaRapmDef.toFixed(2)}</b>]).
      </li>
      <li>Then we calculate a player's contribution to this team total - currently this is a fraction of
      "Adj Rtg+": off=[<b>{offPrior.toFixed(2)}</b>] def=[<b>{defPrior.toFixed(2)}</b>]), ...
      </li>
      <li>
      ... chosen so that a minutes-weighted average of the ratings sums to the team value: off=[<b>{offPriorContrib.toFixed(2)}</b>], def=[<b>{defPriorContrib.toFixed(2)}</b>]
        <ul>
          <li>
          <em> (eg incorporating the % on floor [<b>{offPossPctStr}%</b>] (of [<b>{totalOffPoss}</b>] poss,
             this is an off=[<b>{(offPriorContrib*offPoss).toFixed(2)}</b>] def=[<b>{(defPriorContrib*defPoss).toFixed(2)}</b>]
            "slice" of the team total of off=[<b>{offPriorTotalDiff.toFixed(2)}</b>] def=[<b>{defPriorTotalDiff.toFixed(2)}</b>])</em>
          </li>
        </ul>
      </li>
    </ul>;

    const adaptiveWeight = ctx.priorInfo.strongWeight >= 0 ? ctx.priorInfo.strongWeight : maybeAdaptiveWeight;
    const rapmPriorOverrideInfo = ctx.priorInfo.strongWeight >= 0 ?
      <span> (hand-overwritten to <b>{(adaptiveWeight).toFixed(2)}</b>)</span> : null;

    const detailedInfoPre = <ul>
      <li>To combat the tendency of RAPM to over-share the contribution of the strongest players amongst their typical team-mates,
      we take the weighted average player correlation (see "Player correlation table" in the Global Diagnostics below) [<b>{(maybeAdaptiveWeight).toFixed(2)}</b>]{rapmPriorOverrideInfo}, ...
      </li>
      <li>... and use that % of the player's "Adj Rating+" ([<b>{(adaptiveWeight).toFixed(2)}</b>]*[<b>{(offPrior).toFixed(2)}</b>]) = [<b>{(adaptiveWeight*offPrior).toFixed(2)}</b>] as a prior in the RAPM calculation.
      </li>
      <ul>
        <li><i>(Currently we only do this for offense because ORtg is a much more reliable individual stat than DRtg)</i></li>
      </ul>
      <li>ie Off RAPM [<b>{offUnbiasRapm.toFixed(2)}</b>] = Raw RAPM [<b>{(offUnbiasRapm - adaptiveWeight*offPrior).toFixed(2)}</b>] + Prior [<b>{(adaptiveWeight*offPrior).toFixed(2)}</b>]</li>
    </ul>;

    const totalPrior = offPriorContrib - defPriorContrib;
    const totalRawRapm = offUnbiasRapm - defUnbiasRapm;

    //TODO: play around with player RAPM 
    const offMatrixInputs = rapmInfo.offInputs.solnMatrix.valueOf()[col];
    const [ offAdjPoss, defAdjPoss ] = RapmUtils.calcLineupOutputs(
      "adj_ppp", ctx.avgEfficiency, ctx.avgEfficiency, ctx, ctx.priorInfo.adaptiveCorrelWeights, false
    );
    const rapmDiag = offMatrixInputs.map((p, n) => { return {
      lineupId: n,
      lineupVal: offAdjPoss[n]!,
      matrixVal: p,
      contrib: p*offAdjPoss[n]!
    }; });
    const goodOnLineups = _.chain(rapmDiag).filter(d => d.matrixVal > 0 && d.contrib > 0).sortBy([d => -1*d.contrib]).value();
    const badOnLineups = _.chain(rapmDiag).filter(d => d.matrixVal > 0 && d.contrib < 0).sortBy([d => d.contrib]).value();
    const goodOffLineups = _.chain(rapmDiag).filter(d => d.matrixVal < 0 && d.contrib > 0).sortBy([d => -1*d.contrib]).value();
    const badOffLineups = _.chain(rapmDiag).filter(d => d.matrixVal < 0 && d.contrib < 0).sortBy([d => d.contrib]).value();
    const goodOnTotal = _.chain(goodOnLineups).sumBy(d => d.contrib).value().toFixed(2);
    const goodOnOther = _.chain(goodOnLineups).drop(5).sumBy(d => d.contrib).value().toFixed(2);
    const badOnTotal = _.chain(badOnLineups).sumBy(d => d.contrib).value().toFixed(2);
    const badOnOther = _.chain(badOnLineups).drop(5).sumBy(d => d.contrib).value().toFixed(2);
    const goodOffTotal = _.chain(goodOffLineups).sumBy(d => d.contrib).value().toFixed(2);
    const goodOffOther = _.chain(goodOffLineups).drop(5).sumBy(d => d.contrib).value().toFixed(2);
    const badOffTotal = _.chain(badOffLineups).sumBy(d => d.contrib).value().toFixed(2);
    const badOffOther = _.chain(badOffLineups).drop(5).sumBy(d => d.contrib).value().toFixed(2);
    const test = <span>
      Good On: {_.take(goodOnLineups, 5).map(d => d.contrib.toFixed(2)).join(" ; ")} Other=[{goodOnOther}, {goodOnLineups.length - 5}] Total=[{goodOnTotal}]<br/>
      Bad On: {_.take(badOnLineups, 5).map(d => d.contrib.toFixed(2)).join(" ; ")} Other=[{badOnOther}, {badOnLineups.length - 5}] Total=[{badOnTotal}]<br/>
      Good Off: {_.take(goodOffLineups, 5).map(d => d.contrib.toFixed(2)).join(" ; ")} Other=[{goodOffOther}, {goodOffLineups.length - 5}] Total=[{goodOffTotal}]<br/>
      Bad Off: {_.take(badOffLineups, 5).map(d => d.contrib.toFixed(2)).join(" ; ")} Other=[{badOffOther}, {badOffLineups.length - 5}] Total=[{badOffTotal}]<br/>
    </span>;

    return <span>
        <b>RAPM diagnostics for [{player.playerId}]:</b> adj_off=[<b>{rapmOff.toFixed(2)}</b>], adj_def=[<b>{rapmDef.toFixed(2)}</b>] =
        <ul>
          <li>RAPM contribution: off=[<b>{offUnbiasRapm.toFixed(2)}</b>], def=[<b>{defUnbiasRapm.toFixed(2)}</b>], total=[<b>{totalRawRapm.toFixed(2)}</b>]</li>
            {detailedInfoPre}
          <li>&nbsp;+ POST RAPM adjustment: off=[<b>{offPriorContrib.toFixed(2)}</b>], def=[<b>{defPriorContrib.toFixed(2)}</b>], total=[<b>{totalPrior.toFixed(2)}</b>]</li>
            {detailedInfoPost}
        </ul>
        {test}<br/>
        (<b>More player diagnostics to come...</b>)<br/>(<a href="#" onClick={(event) => { event.preventDefault(); gotoGlobalDiags() }}>Scroll to global RAPM diagnostics</a>)
      </span>;
    }
    catch (err) { //Temp issue during reprocessing
      return <span>Recalculating diags, pending {err.message}</span>;
    }
});

export default RapmPlayerDiagView;
