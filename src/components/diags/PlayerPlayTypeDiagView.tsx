// React imports:
import React, { useState } from "react";

// Next imports:
import { NextPage } from "next";

import _ from "lodash";

// Bootstrap imports:

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Tooltip from "react-bootstrap/Tooltip";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";

// Utils
import {
  PosFamilyNames,
  PlayTypeUtils,
  SourceAssistInfo,
} from "../../utils/stats/PlayTypeUtils";
import { PositionUtils } from "../../utils/stats/PositionUtils";
import { CommonTableDefs } from "../../utils/tables/CommonTableDefs";
import { PlayTypeDiagUtils } from "../../utils/tables/PlayTypeDiagUtils";
import { CbbColors } from "../../utils/CbbColors";
import { LineupUtils } from "../../utils/stats/LineupUtils";

// Component imports
import GenericTable, {
  GenericTableOps,
  GenericTableColProps,
} from "../GenericTable";
import {
  IndivStatSet,
  RosterStatsByCode,
  TeamStatSet,
} from "../../utils/StatModels";

const tidyNumbers = (k: string, v: any) => {
  if (_.isNumber(v)) {
    const numStr = v.toFixed(3);
    if (_.endsWith(numStr, ".000")) {
      return numStr.split(".")[0];
    } else {
      return parseFloat(numStr);
    }
  } else {
    return v;
  }
};

type Props = {
  player: IndivStatSet;
  rosterStatsByCode: RosterStatsByCode;
  teamStats: TeamStatSet;
  showHelp: boolean;
  showDetailsOverride?: boolean;
};
const PlayerPlayTypeDiagView: React.FunctionComponent<Props> = ({
  player,
  rosterStatsByCode,
  teamStats,
  showHelp,
  showDetailsOverride,
}) => {
  const [showPlayerBreakdown, setShowPlayerBreakdown] = useState(
    showDetailsOverride || false
  );
  const [tableType, setTableType] = useState<"scoring">("scoring");

  ////////////////////////////////////

  const allPlayers = PlayTypeUtils.buildPlayerAssistCodeList(player);

  const playerStyle = PlayTypeUtils.buildPlayerStyle(
    "scoringPlaysPct",
    player,
    undefined
  );

  const tooltipBuilder = (id: string, title: string, tooltip: string) => (
    <OverlayTrigger
      placement="auto"
      overlay={<Tooltip id={id + "Tooltip"}>{tooltip}</Tooltip>}
    >
      <i>{title}</i>
    </OverlayTrigger>
  );

  const basicStyleInfo = [
    {
      title: tooltipBuilder(
        "unassist",
        "Unassisted",
        "All scoring plays where the player was unassisted (includes FTs which can never be assisted). Includes half court, scrambles, and transition."
      ),
      ...PlayTypeDiagUtils.buildInfoRow(
        PlayTypeUtils.enrichUnassistedStats(playerStyle.unassisted, player, {})
      ),
    },
    {
      title: tooltipBuilder(
        "assist",
        "Assist totals:",
        "All plays where the player was assisted (left half) or provided the assist (right half). " +
          "The 3 rows below break down assisted plays according to the positional category of the assister/assistee. " +
          "(Includes half court, scramble, and transitions)"
      ),
      ...playerStyle.assisted,
    },
    {
      title: tooltipBuilder(
        "trans",
        "In transition",
        "All plays (assisted or unassisted) that are classified as 'in transition', normally shots taken rapidly after a rebound, miss, or make in the other direction."
      ),
      ...playerStyle.transition,
    },
    {
      title: tooltipBuilder(
        "scramble",
        "Scrambles after RB",
        "All plays (assisted or unassisted) that occur in the aftermath of an offensive rebound, where the offense does not get reset before scoring. " +
          "Examples are putbacks (unassisted) or tips to other players (assisted)"
      ),
      ...playerStyle.scramble,
    },
  ];

  // (note that the interaction between this logic and the innards of the PlayTypeUtils is a bit tangled currently)
  const playerAssistNetwork = _.orderBy(
    allPlayers.map((p) => {
      var mutableTotal = 0;
      const [info, mutableTmpTotal] = PlayTypeUtils.buildPlayerAssistNetwork(
        "scoringPlaysPct",
        p,
        player,
        playerStyle.totalPlaysMade,
        playerStyle.totalAssists,
        rosterStatsByCode
      );
      mutableTotal += mutableTmpTotal;
      return {
        code: p,
        title: (
          <span>
            <b>{rosterStatsByCode[p]?.key || ""}</b> (
            {rosterStatsByCode[p]?.role})
          </span>
        ),
        ...info,
        total_shots_or_assists: mutableTotal,
      };
    }),
    ["total_shots_or_assists"],
    ["desc"]
  );

  const posCategoryAssistNetwork = PlayTypeUtils.buildPosCategoryAssistNetwork(
    playerAssistNetwork,
    rosterStatsByCode,
    player
  ).map((info) => {
    return {
      ...(info.info || {}),
      title: (
        <span>
          <i>{_.capitalize(PosFamilyNames[info.order])}</i>
        </span>
      ),
    };
  });

  const playerBreakdownHtml = showPlayerBreakdown ? (
    <b>
      Player breakdown (
      <a
        href="#"
        onClick={(event) => {
          event.preventDefault();
          setShowPlayerBreakdown(false);
        }}
      >
        hide
      </a>
      ):
    </b>
  ) : (
    <b>
      <a
        href="#"
        onClick={(event) => {
          event.preventDefault();
          setShowPlayerBreakdown(true);
        }}
      >
        Show player breakdown
      </a>
    </b>
  );
  const rawAssistTableData = [
    GenericTableOps.buildTextRow(
      <Row>
        <Col xs={3}></Col>
        <Col xs={3} className="d-flex justify-content-center">
          <i>
            <span>Scored / Assisted By:</span>
          </i>
        </Col>
        <Col xs={6} className="d-flex justify-content-center">
          <i>
            <span>Assists:</span>
          </i>
        </Col>
      </Row>
    ),
  ]
    .concat(
      _.take(basicStyleInfo, 2).map((objData) => {
        return GenericTableOps.buildDataRow(
          objData,
          GenericTableOps.defaultFormatter,
          GenericTableOps.defaultCellMeta
        );
      })
    )
    .concat([GenericTableOps.buildRowSeparator()])
    .concat(
      posCategoryAssistNetwork
        .map((info) =>
          PlayTypeDiagUtils.buildInfoRow(info as unknown as SourceAssistInfo)
        )
        .map((info) =>
          GenericTableOps.buildDataRow(
            info,
            GenericTableOps.defaultFormatter,
            GenericTableOps.defaultCellMeta
          )
        )
    )
    .concat([GenericTableOps.buildRowSeparator()])
    .concat(
      _.drop(basicStyleInfo, 2).map((objData) => {
        return GenericTableOps.buildDataRow(
          objData,
          GenericTableOps.defaultFormatter,
          GenericTableOps.defaultCellMeta
        );
      })
    )
    .concat([GenericTableOps.buildTextRow(playerBreakdownHtml)])
    .concat(
      showPlayerBreakdown
        ? playerAssistNetwork
            .map((info) => PlayTypeDiagUtils.buildInfoRow(info))
            .map((info) =>
              GenericTableOps.buildDataRow(
                info,
                GenericTableOps.defaultFormatter,
                GenericTableOps.defaultCellMeta
              )
            )
        : []
    );

  ////////////////////////////////////

  // Visual layout:

  const maybeBold = (boldIf: String, el: React.ReactElement) => {
    if (boldIf == tableType) {
      return <b>{el}</b>;
    } else {
      return el;
    }
  };
  //TODO: move these to top level like I did for indiv
  const scoringToggle = maybeBold(
    "scoring",
    <a
      href="#"
      onClick={(event) => {
        event.preventDefault();
        setTableType("scoring");
      }}
    >
      Scoring
    </a>
  );
  const usageToggle = maybeBold(
    "usage",
    <a
      href="#"
      onClick={(event) => {
        event.preventDefault();
        setTableType("scoring");
      }}
    >
      Usage
    </a>
  );

  return (
    <span>
      {/*JSON.stringify(_.chain(player).toPairs().filter(kv => kv[0].indexOf("trans") >= 0).values(), tidyNumbers, 3)*/}
      <br />
      <span>
        <b>Scoring Analysis for [{player.key}]</b>
      </span>
      <br />
      <br />
      <Container>
        <Col xs={10}>
          <GenericTable
            responsive={false}
            tableCopyId="rawAssistNetworks"
            tableFields={PlayTypeDiagUtils.rawAssistTableFields(
              showPlayerBreakdown,
              false,
              "scoring"
            )}
            tableData={rawAssistTableData}
          />
        </Col>
      </Container>
    </span>
  );
};
export default PlayerPlayTypeDiagView;
