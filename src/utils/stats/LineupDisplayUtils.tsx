
// Bootstrap imports:
import 'bootstrap/dist/css/bootstrap.min.css';
import Badge from 'react-bootstrap/Badge';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';

// Lodash:
import _ from "lodash";

// Util imports
import { CbbColors } from "../CbbColors";

import { CommonTableDefs } from "../CommonTableDefs";
import "./LineupDisplayUtils.css";

/** Encapsulates some of the logic used to build decorated lineups in LineupStatsTable */
export class LineupDisplayUtils {

  /** Builds an information (over-)loaded lineup HTML */
  static buildDecoratedLineup(
    key: string,
    sortedLineup: { code: string, id: string }[],
    perLineupPlayerMap: Record<string, Record<string, any>>,
    positionFromPlayerKey: Record<string, {posClass: string}>,
    colorField: string,
    decorateLineup: boolean
  ) {
    const tooltip = LineupDisplayUtils.buildTooltipTexts(
      key, sortedLineup, perLineupPlayerMap, positionFromPlayerKey
    );
    if (decorateLineup) {
      return sortedLineup.map((cid: { code: string, id: string }, pid: number) => {
        return <OverlayTrigger placement="auto" overlay={tooltip} key={"" + pid}>{
          LineupDisplayUtils.buildDecoratedPlayer(cid, perLineupPlayerMap, colorField, pid == 4)
        }</OverlayTrigger>;
      });
    } else {
      return <OverlayTrigger placement="auto" overlay={tooltip}>
        <span><b>{sortedLineup.map((cid: { code: string, id: string}) => cid.code).join(" / ")}</b></span>
      </OverlayTrigger>;
    }
  }

  /** Builds a tooltip element for the entire lineup */
  static buildTooltipTexts(
    key: string,
    sortedLineup: { code: string, id: string }[],
    perLineupPlayerMap: Record<string, Record<string, any>>,
    positionFromPlayerKey: Record<string, {posClass: string}>
  ) {
    const tooltipTexts = _.flatMap(sortedLineup, (cid: {id: string, code: string}) => {
      return LineupDisplayUtils.buildTooltipText(cid, perLineupPlayerMap, positionFromPlayerKey);
    });
    const tooltip = <Tooltip id={`${key}_info`}>{_.map(tooltipTexts,
      (t: string, i: number) => <span key={"" + i}>{t}<br/></span>
    )}</Tooltip>;

    return tooltip;
  }

  private static buildTooltipText(
    cid: { code: string, id: string },
    perLineupPlayerMap: Record<string, Record<string, any>>,
    positionFromPlayerKey: Record<string, {posClass: string}>
  ) {
    // Some minimal info:
    const playerInfo = perLineupPlayerMap[cid.id] || {};
    const oRtgStr = (playerInfo.off_rtg?.value || 0).toFixed(0);
    const usageStr = (100*(playerInfo.off_usage?.value || 0)).toFixed(0) + "%";
    const defRbStr = (100*(playerInfo.def_orb?.value || 0)).toFixed(0) + "%";
    return [
      `${cid.id}: ${positionFromPlayerKey[cid.id]?.posClass || "??"}`,
      `ORtg ${oRtgStr} on ${usageStr}, DRB ${defRbStr}`,
      ""
    ];
  }

  /** Builds the player HTML within a lineup */
  static buildDecoratedPlayer(
    cid: { code: string, id: string },
    perLineupPlayerMap: Record<string, Record<string, any>>,
    colorField: string,
    finalPlayer: boolean
  ) {
    const fontWeight = (playerInfo: Record<string, any>) => {
      const usage = _.max(
        [ 0.10, _.min(
          [ playerInfo.off_usage?.value || 0.20, 0.35 ]
        )]
      );
      return 100*_.round((usage < 0.20) ? //10 == 100 weight
        1 + (usage-0.10)*40 : //20 == 500 weight
        5 + (usage-0.20)*20, 0);  //35 ~= 800 weight
    };

    const colorChooser = (field: string) => {
      switch(field) {
        case "off_adj_rtg": return CbbColors.off_diff10_p100_redGreen;
        case "def_adj_rtg": return CbbColors.def_diff10_p100_redGreen;
        case "off_3pr": return CbbColors.fgr_offDef;
        default: return (val: number) => CbbColors.malformedDataColor;
      };
    };

    const singleColorField = (playerInfo: Record<string, any>, field: string) => {
      const val = playerInfo[field]?.value;
      const color = colorChooser(field)(val) + "80"; //(opacity at the end)
      return color;
    };

    const buildBadges = (playerInfo: Record<string, any>) => {
      const _3pr = playerInfo.off_3pr?.value;
      const ftr = playerInfo.off_ftr?.value;
      const assist = playerInfo.off_assist?.value;
      return <span style={{}}>
        { _3pr <= 0.05 ? <sup className="megaTwoPointBadge"></sup> : null }
        { _3pr >= 0.05 && _3pr < 0.2 ? <sup className="twoPointBadge"></sup> : null }
        { _3pr >= 0.45 && _3pr < 0.6 ? <sup className="threePointBadge"></sup> : null }
        { _3pr >= 0.6 ? <sup className="megaThreePointBadge"></sup> : null }
        { ftr > 0.35 && ftr < 0.60 ? <sub className="freeThrowBadge"></sub> : null }
        { ftr >= 0.6 ? <sub className="megaFreeThrowBadge"></sub> : null }
        { assist >= 0.18 && assist < 0.25 ? <sup className="assistBadge"></sup> : null }
        { assist >= 0.25 ? <sup className="megaAssistBadge"></sup> : null }
      </span>;
    };

    const playerInfo = perLineupPlayerMap[cid.id];
    return <span key={cid.code}>
      <span style={{whiteSpace: 'nowrap'}}><Badge variant="light"
        style={{
          backgroundColor: singleColorField(playerInfo, colorField)
// consider this in the future:
//          background: `linear-gradient(to right, ${singleColorField(cid.id, colorField)}, white, ${singleColorField(cid.id, "def_adj_rtg")})`
        }}>
          <span style={{
            fontSize: "small",
            fontWeight: fontWeight(playerInfo)
          }}>{cid.code}</span>
      </Badge>
      {buildBadges(playerInfo)}</span>
      {finalPlayer ? null : <span style={{opacity: 0}}> ; </span> }
    </span>;
  }

  /** Inject various assist info into the table cell inputs */
  static injectAssistInfo(stat: Record<string, any>, expandedView: boolean, playerView: boolean) {
    if (playerView) {
      // Put assist %s as the row underneath shot types:
      const buildInfoRow = (stat: any) =>
        <small style={CommonTableDefs.getTextShadow(stat, CbbColors.fgr_offDef)}>
          <i>{(100*(stat?.value || 0)).toFixed(0)}%</i>
        </small>;
      stat.def_2primr = buildInfoRow(stat.off_2prim_ast);
      stat.def_2pmidr = buildInfoRow(stat.off_2pmid_ast);
      stat.def_3pr = buildInfoRow(stat.off_3p_ast);
    }
    if (stat.off_assist) {
      const rimPct = (100*(stat.off_ast_rim?.value || 0)).toFixed(0);
      const midPct = (100*(stat.off_ast_mid?.value || 0)).toFixed(0);
      const threePct = (100*(stat.off_ast_3p?.value || 0)).toFixed(0);
      stat.off_assist.extraInfo = <span>
        Assist breakdown:
        <li>{rimPct}% at the rim</li>
        <li>{midPct}% for mid-range</li>
        <li>{threePct}% for 3P</li>
      </span>;
    }

    // Handle adding and removing of extra info:
    if (expandedView) {
      if (stat.off_2primr) {
        delete stat.off_2primr.extraInfo;
      }
      if (stat.off_2pmidr) {
        delete stat.off_2pmidr.extraInfo;
      }
      if (stat.off_3pr) {
        delete stat.off_3pr.extraInfo;
      }
    } else {
      const buildText = (stat: any) => {
        return `${(100*(stat?.value || 0)).toFixed(0)}% assisted`
      }
      if (stat.off_2primr) {
        stat.off_2primr.extraInfo = <span>{buildText(stat.off_2prim_ast)}</span>;
      }
      if (stat.off_2pmidr) {
        stat.off_2pmidr.extraInfo = <span>{buildText(stat.off_2pmid_ast)}</span>;
      }
      if (stat.off_3pr) {
        stat.off_3pr.extraInfo = <span>{buildText(stat.off_3p_ast)}</span>;
      }
    }
  }

}
