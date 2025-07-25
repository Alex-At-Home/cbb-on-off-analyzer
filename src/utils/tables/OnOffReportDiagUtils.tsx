// Lodash:
import _ from "lodash";

// Bootstrap imports:
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import Tooltip from "react-bootstrap/Tooltip";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";

// Component imports
import GenericTable, {
  GenericTableOps,
  GenericTableColProps,
} from "../../components/GenericTable";

// Utils
import { QueryUtils } from "../QueryUtils";
import { UrlRouting } from "../UrlRouting";
import { CommonTableDefs } from "../tables/CommonTableDefs";
import {
  CommonFilterParams,
  TeamReportFilterParams,
  ParamDefaults,
} from "../FilterModels";

/** Encapsulates some of the logic used to build the diag visualiations in TeamReportStatsTable */
export class OnOffReportDiagUtils {
  // 1] Roster comparison logic

  /** Util to calc on/off margins */
  static readonly getAdjEffMargins = (player: Record<string, any>) => {
    const onMargin =
      (player?.on?.off_adj_ppp?.value || 0.0) -
      (player?.on?.def_adj_ppp?.value || 0.0);
    const offMargin =
      (player.off?.off_adj_ppp?.value || 0.0) -
      (player?.off?.def_adj_ppp?.value || 0.0);
    return [onMargin, offMargin];
  };

  /** Builds an array of players vs their margin differences (using RAPM or replacement on/off if available)*/
  static readonly buildPlayerSummary = (
    playersWithAdjEff: Array<Record<string, any>>,
    incRapm: boolean,
    incReplacementOnOff: boolean
  ) => {
    const powerType = incRapm
      ? "RAPM "
      : incReplacementOnOff
      ? "'r:On-Off' "
      : "'On-Off' ";
    return [
      _.chain(playersWithAdjEff)
        .map((player) => {
          if (incRapm && player.rapm?.key) {
            return [
              player.playerId,
              (player.rapm?.off_adj_ppp?.value || 0.0) -
                (player.rapm?.def_adj_ppp?.value || 0.0),
            ];
          } else if (incReplacementOnOff && player.replacement?.key) {
            return [
              player.playerId,
              (player.replacement?.off_adj_ppp?.value || 0.0) -
                (player.replacement?.def_adj_ppp?.value || 0.0),
            ];
          } else {
            const [onMargin, offMargin] =
              OnOffReportDiagUtils.getAdjEffMargins(player);
            return [player.playerId, 0.2 * (onMargin - offMargin)];
          }
        })
        .fromPairs()
        .value(),
      powerType,
    ] as [Record<string, number>, string];
  };

  /** Builds lineup composition info */
  static readonly buildLineupInfo = (
    playerObj: Record<string, any>,
    playerLineupPowerSet: Record<string, any>,
    powerType: string
  ) => {
    const totalOnPoss = _.max([
      playerObj.on.off_poss.value + playerObj.on.def_poss.value,
      1,
    ]);
    const totalOffPoss = _.max([
      playerObj.off.off_poss.value + playerObj.off.def_poss.value,
      1,
    ]);
    const playerPcts = _.chain(playerObj.teammates)
      .toPairs()
      .filter((keyVal) => {
        return keyVal[0] != playerObj.playerId;
      })
      .map((keyVal) => {
        const possObj = keyVal[1];
        const onPoss = possObj.on.off_poss + possObj.on.def_poss;
        const offPoss = possObj.off.off_poss + possObj.off.def_poss;
        return {
          name: keyVal[0],
          onPct: (100.0 * onPoss) / totalOnPoss,
          offPct: (100.0 * offPoss) / totalOffPoss,
        };
      })
      .value();

    const lineupPower = _.sumBy(playerPcts, (pctObj) => {
      return (
        0.01 *
        (pctObj.onPct - pctObj.offPct) *
        (playerLineupPowerSet[pctObj.name] || 0)
      );
    });
    return _.concat(
      _.chain(playerPcts)
        .orderBy(["onPct"], ["desc"])
        .map((pctObj, index) => {
          return (
            <span key={"" + index}>
              <span>{pctObj.name}</span>{" "}
              <span className="text-muted">
                ([{pctObj.onPct.toFixed(1)}]% - [{pctObj.offPct.toFixed(1)}]%)
              </span>
              ;&nbsp;
            </span>
          );
        })
        .value(),
      <span key="last">
        <b>{powerType} Lineup rating:</b> [{lineupPower.toFixed(1)}]
      </span>
    );
  };

  // 2] Replacement on/off diag logic

  static getTitle(
    player: Record<string, any>,
    showHelp: boolean,
    advanced: boolean = false
  ) {
    return (
      <span>
        <b>
          Replacement 'On-Off' {advanced ? "Advanced " : ""}Diagnostics For [
          {player.playerId}]
        </b>{" "}
        {showHelp ? (
          <a
            href="https://hoop-explorer.blogspot.com/2020/03/diagnostics-mode-for-replacement-onoff.html"
            target="_blank"
          >
            (?)
          </a>
        ) : null}
      </span>
    );
  }

  /** Builds a query for on/off analysis of a same-4 */
  static getSame4Query(same4Players: string[]) {
    return `{${same4Players.map((s: string) => `"${s}"`).join(";")}}=4`;
  }

  /** Builds some of the diag info that is required by both diag views */
  static getRepOnOffDiagInfo(
    player: Record<string, any>,
    regressDiffs: number
  ) {
    return _.chain(player?.replacement?.myLineups)
      .map((lineup: any) => {
        const onLineupKeyArray = lineup.key.split("_");
        const onLineupPlayerId =
          _.difference(
            onLineupKeyArray,
            (lineup.offLineupKeys?.[0] || "").split("_")
          )?.[0] || "unknown";
        const onLineupKeyArrayNotPlayer = onLineupKeyArray.filter(
          (player: string) => player != onLineupPlayerId
        );

        const lineupDiffAdjEff = {
          off_adj_ppp: {
            value:
              lineup.onLineup.off_adj_ppp.value -
              lineup.offLineups.off_adj_ppp.value,
          },
          def_adj_ppp: {
            value:
              lineup.onLineup.def_adj_ppp.value -
              lineup.offLineups.def_adj_ppp.value,
          },
        };

        const regressed = (n: number | undefined) => {
          const num = n || 0;
          return regressDiffs < 0 ? -regressDiffs : num + regressDiffs;
        };
        const offTotalPoss =
          regressed(player?.replacement?.off_poss?.value) || 1;
        const defTotalPoss =
          regressed(player?.replacement?.def_poss?.value) || 1;
        const offContrib =
          (lineupDiffAdjEff.off_adj_ppp.value *
            (lineup?.off_poss?.value || 0)) /
          offTotalPoss;
        const defContrib =
          (lineupDiffAdjEff.def_adj_ppp.value *
            (lineup?.def_poss?.value || 0)) /
          defTotalPoss;

        // Calculate the impact of a player's "peer" (sub-in replacement):
        // Note peer==same-4 for a given player being looked at
        const globalLineupInfo = player?.replacement?.lineupUsage || {};
        const peers = _.chain(lineup.offLineupKeys)
          .transform((acc, v) => {
            const lineupInfo = globalLineupInfo[v];
            if (lineupInfo) {
              const peerId =
                (_.difference(
                  lineupInfo.keyArray || [],
                  onLineupKeyArrayNotPlayer
                )?.[0] as string) || "unknown";
              acc[peerId] = lineupInfo;
            }
          }, {} as Record<string, any>)
          .value();

        return {
          lineup: lineup,
          playerId: onLineupPlayerId,
          keyArray: onLineupKeyArrayNotPlayer,
          peers: peers,
          contrib: {
            off: {
              totalPoss: lineup?.off_poss?.value || 0,
              possWeight: (lineup?.off_poss?.value || 0) / offTotalPoss,
              adjEff: offContrib,
            },
            def: {
              totalPoss: lineup?.def_poss?.value || 0,
              possWeight: (lineup?.def_poss?.value || 0) / defTotalPoss,
              adjEff: defContrib,
            },
          },
          diffAdjEff: lineupDiffAdjEff,
        };
      })
      .value();
  }

  /** Allows the user to set the sort order for advanced diags */
  private static buildAdvRepOnOffSort(
    sizeSortFieldOrder: [number, string, number],
    onSetSortOrder: (field: string, dir: number) => void
  ) {
    const fields: Array<[string, number, string]> = [
      ["Most common", -1, "lineup.off_poss.value"],
      ["Best Off", -1, "contrib.off.adjEff"],
      ["Worst Off", 1, "contrib.off.adjEff"],
      ["Best Def", 1, "contrib.def.adjEff"],
      ["Worst Def", -1, "contrib.def.adjEff"],
    ];
    const currDefaultIndex = _.findIndex(
      fields,
      (titleDirField: [string, number, string]) =>
        titleDirField[1] == sizeSortFieldOrder[2] &&
        titleDirField[2] == sizeSortFieldOrder[1]
    );
    return fields.map(
      (titleDirField: [string, number, string], index: number) => {
        const spaces =
          index == 0 ? (
            <span>&nbsp;</span>
          ) : (
            <span>&nbsp;&nbsp;|&nbsp;&nbsp;</span>
          );
        const link = (
          <a
            href="#"
            onClick={(event) => {
              event.preventDefault();
              onSetSortOrder(titleDirField[2], titleDirField[1]);
            }}
          >
            {titleDirField[0]}
          </a>
        );
        const maybeBoldLink = index == currDefaultIndex ? <b>{link}</b> : link;
        return (
          <span key={"" + index}>
            {spaces}
            {maybeBoldLink}
          </span>
        );
      }
    );
  }

  private static readonly same4sTooltip = (
    <Tooltip id="same4sTooltip">
      Open a tab with the stats for all the lineups in the "same-4" set
    </Tooltip>
  );

  private static readonly onOffSame4Tooltip = (
    <Tooltip id="onOffSame4Tooltip">
      Open a tab with the on/off analysis for the player, "same-4" sets only
    </Tooltip>
  );

  private static readonly playerCompareTooltip = (
    <Tooltip id="playerCompareTooltip">
      Open a tab with a detailed "same-4" comparison of the two players
    </Tooltip>
  );

  /** A common UI element for showing the link to view on/off analysis of a same-4 */
  static buildOnOffAnalysisLink(
    playerId: string,
    same4Players: string[],
    commonParams: CommonFilterParams,
    title?: string
  ) {
    const onOffParams = {
      ...commonParams,
      onQuery: `"${playerId}" AND ${OnOffReportDiagUtils.getSame4Query(
        same4Players
      )}`,
      offQuery: `NOT "${playerId}" AND ${OnOffReportDiagUtils.getSame4Query(
        same4Players
      )}`,
      autoOffQuery: false,
    };

    return (
      <OverlayTrigger
        placement="auto"
        overlay={OnOffReportDiagUtils.onOffSame4Tooltip}
      >
        <a href={UrlRouting.getGameUrl(onOffParams, {})} target="_blank">
          {title || "On/Off Analysis..."}
        </a>
      </OverlayTrigger>
    );
  }

  /** A common UI element for showing the link to view same-4 between a player and his peer */
  static buildPlayerComparisonLink(
    playerId: string,
    playerCode: string,
    peerId: string,
    peerCode: string,
    baseQuery: [string, string | undefined],
    commonParams: CommonFilterParams
  ) {
    const extraQueryEl = `{"${playerId}";"${peerId}"}=1`;
    if ((commonParams.baseQuery || "").indexOf(extraQueryEl) >= 0) {
      // If we're already inside this mode then don't add a link
      return <b>{peerCode}</b>;
    } else {
      const teamReportParms = {
        filter: playerCode,
        incRepOnOff: true,
        repOnOffDiagMode:
          ParamDefaults.defaultTeamReportRepOnOffDiagModeIfEnabled[0],
        ...commonParams,
        baseQuery: QueryUtils.injectIntoQuery(extraQueryEl, baseQuery),
      };
      return (
        <OverlayTrigger
          placement="auto"
          overlay={OnOffReportDiagUtils.playerCompareTooltip}
        >
          <a
            href={UrlRouting.getTeamReportUrl(teamReportParms)}
            target="_blank"
          >
            {peerCode}
          </a>
        </OverlayTrigger>
      );
    }
  }

  /** Takes various pre-computer rep on-off diag info and builds a table of advanced diag info */
  static getRepOnOffDiags(
    player: Record<string, any>,
    playerMap: Record<string, string>,
    lineupsPlusDiags: Array<Record<string, any>>, // generated by getRepOnOffDiagInfo
    commonParams: CommonFilterParams,
    sizeSortFieldOrder: [number, string, number], //default: lineup.off_poss.value, -1
    onSetSortOrder: (field: string, dir: number) => void,
    showHelp: boolean
  ) {
    // Build player comparison links with peers:
    const baseMaybeAdvQuery = QueryUtils.extractAdvancedQuery(
      commonParams.baseQuery || ""
    );
    const mutablePeerLinkMap = {} as Record<string, any>; //(have a cache since there are a bunch of these links)
    const compareLinkFromPeer = (peerCode: string) => {
      if (!mutablePeerLinkMap.hasOwnProperty(peerCode)) {
        mutablePeerLinkMap[peerCode] =
          OnOffReportDiagUtils.buildPlayerComparisonLink(
            player.playerId,
            player.playerCode,
            playerMap[peerCode] || peerCode,
            peerCode,
            baseMaybeAdvQuery,
            commonParams
          );
      }
      return mutablePeerLinkMap[peerCode];
    };

    return _.flatten([
      [
        GenericTableOps.buildTextRow(
          <Container>
            <Row>{OnOffReportDiagUtils.getTitle(player, showHelp, true)}</Row>
            <Row className="small">
              <Col>
                Sort by:
                {OnOffReportDiagUtils.buildAdvRepOnOffSort(
                  sizeSortFieldOrder,
                  onSetSortOrder
                )}
              </Col>
            </Row>
          </Container>
        ),
      ],
      _.chain(lineupsPlusDiags)
        .sortBy([
          (lineupPlusDiag) =>
            sizeSortFieldOrder[2] *
            _.get(lineupPlusDiag, sizeSortFieldOrder[1]),
        ])
        .take(sizeSortFieldOrder[0])
        .flatMap((lineupPlusDiag: any) => {
          const onLineupKeyArray = lineupPlusDiag.keyArray;

          const lineupKeys = (keyArray: string[], peerId: string) => {
            return keyArray
              .filter((pid) => pid != peerId)
              .map((pid, i) => (
                <span key={"" + i}>
                  {pid}/<wbr />
                </span>
              ))
              .concat(
                <span key={"newPlayerId"}>{compareLinkFromPeer(peerId)}</span>
              );
          };
          const lineupSummary = _.chain(lineupPlusDiag.peers || {})
            .toPairs()
            .sortBy([(kv) => -kv[1].poss])
            .take(sizeSortFieldOrder[0])
            .map((kv, i) => (
              <span key={"" + i}>
                {lineupKeys(kv[1].keyArray, kv[0])}{" "}
                <span className="text-muted">
                  (p=[{kv[1].poss}]/o=[{kv[1].overlap}])
                </span>
                ;&nbsp;
              </span>
            ))
            .value();

          const onLineupPlayerId = lineupPlusDiag.keyArray;

          const offContrib = lineupPlusDiag.contrib.off.adjEff;
          const defContrib = lineupPlusDiag.contrib.def.adjEff;
          const contribStr = (
            <span>
              Adj Eff Contrib:
              <br />
              off=[<b>{offContrib.toFixed(2)}</b>] def=[
              <b>{defContrib.toFixed(2)}</b>]
            </span>
          );

          const nonPlayerLineup = onLineupKeyArray.filter(
            (pid: string) => pid != onLineupPlayerId
          );
          const lineupParams = {
            ...commonParams,
            minPoss: "0",
            maxTableSize: "100",
            //sortBy: use default
            filter: nonPlayerLineup.join(","),
          };
          const same4Players = _.chain(
            lineupPlusDiag.lineup?.players_array?.hits?.hits?.[0]?._source
              ?.players || []
          )
            .map((v) => v.id)
            .filter((pid) => pid != player.playerId)
            .value();

          const offTitleWithLinks = (
            <div>
              <b>'Off' Same-4 Lineups</b>
              <br />
              {OnOffReportDiagUtils.buildOnOffAnalysisLink(
                player.playerId,
                same4Players,
                commonParams
              )}
              <br />
              <OverlayTrigger
                placement="auto"
                overlay={OnOffReportDiagUtils.same4sTooltip}
              >
                <a
                  href={UrlRouting.getLineupUrl(lineupParams, {})}
                  target="_blank"
                >
                  Lineup Analysis...
                </a>
              </OverlayTrigger>
            </div>
          );

          const lineupKey = nonPlayerLineup.join(" / ");
          const lineupDiffStats = {
            off_title: (
              <span>
                Same-4: <b>{lineupKey}</b>
              </span>
            ),
            def_title: "",
            ...lineupPlusDiag.lineup,
            ...lineupPlusDiag.diffAdjEff,
          };
          const lineupOnStats = {
            off_title: (
              <span>
                <b>'On' Lineup</b>
                <br />
                {contribStr}
              </span>
            ),
            def_title: "",
            ...lineupPlusDiag.lineup.onLineup,
          };
          const lineupOffStats = {
            off_title: offTitleWithLinks,
            def_title: "",
            ...lineupPlusDiag.lineup.offLineups,
          };
          return [
            GenericTableOps.buildDataRow(
              lineupDiffStats,
              CommonTableDefs.offPrefixFn,
              CommonTableDefs.offCellMetaFn,
              CommonTableDefs.onOffReportReplacement
            ),
            GenericTableOps.buildDataRow(
              lineupDiffStats,
              CommonTableDefs.defPrefixFn,
              CommonTableDefs.defCellMetaFn,
              CommonTableDefs.onOffReportReplacement
            ),
            GenericTableOps.buildDataRow(
              lineupOnStats,
              CommonTableDefs.offPrefixFn,
              CommonTableDefs.offCellMetaFn,
              CommonTableDefs.onOffReportWithFormattedTitle
            ),
            GenericTableOps.buildDataRow(
              lineupOnStats,
              CommonTableDefs.defPrefixFn,
              CommonTableDefs.defCellMetaFn
            ),
            GenericTableOps.buildDataRow(
              lineupOffStats,
              CommonTableDefs.offPrefixFn,
              CommonTableDefs.offCellMetaFn,
              CommonTableDefs.onOffReportWithFormattedTitle
            ),
            GenericTableOps.buildDataRow(
              lineupOffStats,
              CommonTableDefs.defPrefixFn,
              CommonTableDefs.defCellMetaFn
            ),
            GenericTableOps.buildTextRow(
              <span>
                <b>Same-4 Lineup Counts:</b> {lineupSummary}
              </span>,
              "small"
            ),
            GenericTableOps.buildRowSeparator(),
          ];
        })
        .value(),
      [GenericTableOps.buildRowSeparator()],
    ]);
  }
}
