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
  TargetAssistInfo,
} from "../../utils/stats/PlayTypeUtils";
import { PlayTypeDiagUtils } from "../../utils/tables/PlayTypeDiagUtils";

// Component imports
import GenericTable, { GenericTableOps } from "../GenericTable";
import {
  IndivStatSet,
  RosterStatsByCode,
  StatModels,
  TeamStatSet,
} from "../../utils/StatModels";
import { DivisionStatsCache } from "../../utils/tables/GradeTableUtils";

type Props = {
  title: string;
  tableType?: "scoring" | "usage";
  players: Array<IndivStatSet>;
  rosterStatsByCode: RosterStatsByCode;
  teamStats: TeamStatSet;
  avgEfficiency: number;
  quickSwitchOptions?: Props[];
  showGrades: string;
  grades?: DivisionStatsCache;
  showHelp: boolean;
};
const TeamPlayTypeDiagView: React.FunctionComponent<Props> = ({
  title,
  tableType,
  players: playersIn,
  rosterStatsByCode,
  teamStats: teamStatsIn,
  avgEfficiency,
  quickSwitchOptions,
  showGrades,
  grades,
  showHelp,
}) => {
  const [quickSwitch, setQuickSwitch] = useState<string | undefined>(undefined);
  const [quickSwitchTimer, setQuickSwitchTimer] = useState<
    NodeJS.Timer | undefined
  >(undefined);
  const players =
    (quickSwitch
      ? _.find(quickSwitchOptions || [], (opt) => opt.title == quickSwitch)
          ?.players
      : playersIn) || [];
  const teamStats =
    (quickSwitch
      ? _.find(quickSwitchOptions || [], (opt) => opt.title == quickSwitch)
          ?.teamStats
      : teamStatsIn) || StatModels.emptyTeam();

  return React.useMemo(() => {
    const [reorderedPosVsPosAssistNetwork, maybeExtraNetwork] = _.thru(
      tableType,
      () => {
        if (tableType == "scoring") {
          return [
            PlayTypeUtils.buildCategorizedAssistNetworks(
              "scoringPlaysPct",
              false,
              players,
              rosterStatsByCode,
              teamStats
            ),
            undefined,
          ];
        } else if (tableType == "usage") {
          const network1 = PlayTypeUtils.buildCategorizedAssistNetworks(
            "playsPct",
            true,
            players,
            rosterStatsByCode,
            teamStats
          );
          const network2 = PlayTypeUtils.buildCategorizedAssistNetworks(
            "pointsPer100",
            true,
            players,
            rosterStatsByCode,
            teamStats
          );

          return [network1, network2];
        } else {
          return [{}, undefined];
        }
      }
    );

    const tooltipBuilder = (id: string, title: string, tooltip: string) => (
      <OverlayTrigger
        placement="auto"
        overlay={<Tooltip id={id + "Tooltip"}>{tooltip}</Tooltip>}
      >
        <i>{title}</i>
      </OverlayTrigger>
    );

    const rawAssistTableData = (
      tableType == "scoring"
        ? [
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
        : []
    ).concat(
      _.chain(reorderedPosVsPosAssistNetwork)
        .toPairs()
        .flatMap((kv, ix) => {
          const posTitle = kv[0];
          const assistInfo = kv[1].assists;
          const otherInfo = kv[1].other;

          const extraAssistInfo = maybeExtraNetwork?.[posTitle]?.assists;
          const extraOtherInfo = maybeExtraNetwork?.[posTitle]?.other;

          const asStatSet = (
            targetAssistInfo: TargetAssistInfo | undefined
          ): IndivStatSet =>
            (targetAssistInfo || {}) as unknown as IndivStatSet;

          return [
            GenericTableOps.buildDataRow(
              {
                title: <b>{_.capitalize(posTitle)} from/to:</b>,
              },
              GenericTableOps.defaultFormatter,
              GenericTableOps.defaultCellMeta
            ),
            GenericTableOps.buildDataRow(
              {
                ...PlayTypeDiagUtils.buildInfoRow(
                  PlayTypeUtils.enrichUnassistedStats(
                    otherInfo[0]!,
                    ix,
                    rosterStatsByCode
                  ),
                  asStatSet(extraOtherInfo?.[0])
                ),
                title: tooltipBuilder(
                  "unassisted",
                  "Unassisted",
                  `All scoring plays where the ${posTitle} was unassisted (includes FTs which can never be assisted). ` +
                    (tableType == "usage"
                      ? "(Half-court only)"
                      : "(Includes half court, scramble, and transitions)")
                ),
              },
              GenericTableOps.defaultFormatter,
              GenericTableOps.defaultCellMeta
            ),
            GenericTableOps.buildDataRow(
              {
                ...PlayTypeDiagUtils.buildInfoRow(
                  otherInfo[1]!,
                  asStatSet(extraOtherInfo?.[1])
                ),
                title: tooltipBuilder(
                  "assist",
                  "Assist totals:",
                  `All plays where the  ${posTitle} was assisted (left half) or provided the assist (right half). ` +
                    "The 3 rows below break down assisted plays according to the positional category of the assister/assistee. " +
                    (tableType == "usage"
                      ? "(Half-court only)"
                      : "(Includes half court, scramble, and transitions)")
                ),
              },
              GenericTableOps.defaultFormatter,
              GenericTableOps.defaultCellMeta
            ),
          ]
            .concat(
              GenericTableOps.buildRowSeparator(),
              assistInfo
                .map((info: any, index: number) =>
                  PlayTypeDiagUtils.buildInfoRow(
                    info,
                    asStatSet(extraAssistInfo?.[index])
                  )
                )
                .map((info: any) =>
                  GenericTableOps.buildDataRow(
                    {
                      ...info,
                      title: (
                        <span>
                          <i>{_.capitalize(PosFamilyNames[info.order])}</i>
                        </span>
                      ),
                    },
                    GenericTableOps.defaultFormatter,
                    GenericTableOps.defaultCellMeta
                  )
                )
            )
            .concat([
              GenericTableOps.buildRowSeparator(),
              GenericTableOps.buildDataRow(
                {
                  ...PlayTypeDiagUtils.buildInfoRow(
                    otherInfo[2]!,
                    asStatSet(extraOtherInfo?.[2])
                  ),
                  title: tooltipBuilder(
                    "trans",
                    "In transition",
                    "All plays (assisted or unassisted) that are classified as 'in transition', normally shots taken rapidly after a rebound, miss, or make in the other direction."
                  ),
                },
                GenericTableOps.defaultFormatter,
                GenericTableOps.defaultCellMeta
              ),
              GenericTableOps.buildDataRow(
                {
                  ...PlayTypeDiagUtils.buildInfoRow(
                    otherInfo[3]!,
                    asStatSet(extraOtherInfo?.[3])
                  ),
                  title: tooltipBuilder(
                    "scramble",
                    "Scrambles after RB",
                    "All plays (assisted or unassisted) that occur in the aftermath of an offensive rebound, where the offense does not get reset before scoring. " +
                      "Examples are putbacks (unassisted) or tips to other players (assisted)"
                  ),
                },
                GenericTableOps.defaultFormatter,
                GenericTableOps.defaultCellMeta
              ),
              GenericTableOps.buildRowSeparator(),
            ]);
        })
        .value()
    );

    const maybeBold = (boldIf: String, el: React.ReactElement) => {
      if (boldIf == tableType) {
        return <b>{el}</b>;
      } else {
        return el;
      }
    };

    return (
      <span>
        {/*JSON.stringify(_.chain(teamStats).toPairs().filter(kv => kv[0].indexOf("trans") >= 0).values(), tidyNumbers, 3)*/}
        {title
          ? PlayTypeDiagUtils.buildQuickSwitchOptions(
              title,
              quickSwitch,
              quickSwitchOptions,
              setQuickSwitch,
              quickSwitchTimer,
              setQuickSwitchTimer
            )
          : undefined}
        <Container className="mt-2">
          <Col xs={10}>
            <GenericTable
              responsive={false}
              tableCopyId="teamAssistNetworks"
              tableFields={PlayTypeDiagUtils.rawAssistTableFields(
                false,
                true,
                tableType || "usage",
                tableType == "usage"
              )}
              tableData={rawAssistTableData}
            />
          </Col>
        </Container>
      </span>
    );
  }, [
    players,
    tableType,
    grades,
    showGrades,
    teamStats,
    quickSwitch,
    quickSwitchTimer,
  ]);
};
export default TeamPlayTypeDiagView;
