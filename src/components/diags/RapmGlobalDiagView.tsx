// React imports:
import React, { useState } from "react";

import _ from "lodash";

// Next imports:
import { NextPage } from "next";

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

// Component imports
import GenericTable, {
  GenericTableOps,
  GenericTableColProps,
} from "../GenericTable";
// @ts-ignore
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  Label,
} from "recharts";

// Utils
import {
  RapmInfo,
  RapmPlayerContext,
  RapmPreProcDiagnostics,
  RapmProcessingInputs,
  RapmUtils,
} from "../../utils/stats/RapmUtils";
import { CbbColors } from "../../utils/CbbColors";
import { PlayerOnOffStats, LineupUtils } from "../../utils/stats/LineupUtils";
import { useTheme } from "next-themes";

//TODO
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
const showMatrix = (m: any) => {
  (m as any[]).map((row, index) => {
    return index + ": " + JSON.stringify(row, tidyNumbers);
  });
};

type Props = {
  rapmInfo: RapmInfo;
  topRef: React.RefObject<HTMLDivElement>;
};

/** From https://colorbrewer2.org/#type=qualitative&scheme=Paired&n=12 */
const categoricalPalette = [
  "#a6cee3",
  "#1f78b4",
  "#b2df8a",
  "#33a02c",
  "#fb9a99",
  "#e31a1c",
  "#fdbf6f",
  "#ff7f00",
  "#cab2d6",
  "#6a3d9a",
  "#ffff99",
  "#b15928",
];

const RapmGlobalDiagView: React.FunctionComponent<Props> = ({
  rapmInfo,
  topRef,
}) => {
  const { theme } = useTheme();

  if (rapmInfo.preProcDiags)
    try {
      const ctx = rapmInfo.ctx;
      const gotoTop = () => {
        if (topRef.current) {
          topRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      };

      // Player correlation matrix

      // Table defs:
      var currInitialsMap = {} as Record<string, string>;
      var currInitialsCountMap = {} as Record<string, number>;
      const playerInitials = (p: string) =>
        LineupUtils.getOrBuildPlayerIdToInitials(
          p,
          currInitialsMap,
          currInitialsCountMap
        );
      const correlTableFields = {
        title: GenericTableOps.addTitle("", ""),
        sep0: GenericTableOps.addColSeparator(),
        ..._.fromPairs(
          ctx.colToPlayer.map((p: string) => {
            const initials = playerInitials(p);
            const description = `Correlations for "${p}"`;
            return [
              initials,
              GenericTableOps.addPctCol(
                initials,
                description,
                CbbColors.varPicker(CbbColors.rapmCorrel)
              ),
            ];
          })
        ),
      };
      // Table data:
      const tmpCorrelMatrix = rapmInfo.preProcDiags.correlMatrix.valueOf();

      const correlTableData = ctx.colToPlayer
        .map((p: string, i: number) => {
          return GenericTableOps.buildDataRow(
            {
              title: p,
              ..._.fromPairs(
                tmpCorrelMatrix[i]
                  .map((n: number, j: number) =>
                    i != j
                      ? [playerInitials(ctx.colToPlayer[j]), { value: n }]
                      : ["", 0]
                  )
                  .filter((kv: [string, number]) => kv[1] != 0)
              ),
            },
            GenericTableOps.defaultFormatter,
            GenericTableOps.defaultCellMeta
          );
        })
        .concat([
          GenericTableOps.buildDataRow(
            {
              title: "Adaptive correlation weight",
              ..._.fromPairs(
                rapmInfo.preProcDiags.adaptiveCorrelWeights.map(
                  (n: number, j: number) => [
                    playerInitials(ctx.colToPlayer[j]),
                    { value: n },
                  ]
                )
              ),
            },
            GenericTableOps.defaultFormatter,
            GenericTableOps.defaultCellMeta
          ),
        ]);

      // Player removal

      const playerThreshold = ctx.config.removalPct;
      const playerRemovalTidy = (
        playerList: Array<[string, [number, number, Record<string, any>]]>,
        phase: "p1" | "p2"
      ) => {
        return _.sortBy(playerList, [
          (playerPoss: [string, [number, number, Record<string, any>]]) =>
            -playerPoss[1][0],
        ]).map(
          (playerPoss: [string, [number, number, Record<string, any>]]) => {
            const extra =
              phase == "p1"
                ? ""
                : `->[${(100 * playerPoss[1][1]).toFixed(1)}%]`;
            return `"${playerPoss[0]}" [${(100 * playerPoss[1][0]).toFixed(
              1
            )}%]${extra}`;
          }
        );
      };
      const tmpRemovedPlayersPhase1 = playerRemovalTidy(
        _.toPairs(ctx.removedPlayers).filter(
          (playerPoss: [string, [number, number, Record<string, any>]]) =>
            playerPoss[1][0] <= ctx.config.removalPct
        ),
        "p1"
      );

      // Collinearity analysis

      // Some helper methods:
      const lineupCombos = rapmInfo.preProcDiags.lineupCombos;
      const collinCol = (index: number) => `LC${index + 1}`;
      const collinColDef = (index: number) =>
        `Linear combination of lineups ${index + 1}`;

      // Table defs
      const collinTableFields_Base = {
        title: GenericTableOps.addTitle("", ""),
        sep0: GenericTableOps.addColSeparator(),
      };
      const collinTableFields_CondIndices = _.assign(
        _.clone(collinTableFields_Base),
        _.fromPairs(
          lineupCombos.map((n: number, index: number) => [
            collinCol(index),
            GenericTableOps.addPtsCol(
              collinCol(index),
              collinColDef(index),
              CbbColors.varPicker(CbbColors.rapmCollinLineup, 0.01)
            ),
          ])
        )
      );
      const collinTableFields = _.assign(
        _.clone(collinTableFields_Base),
        _.fromPairs(
          lineupCombos.map((n: number, index: number) => [
            collinCol(index),
            GenericTableOps.addPctCol(
              collinCol(index),
              collinColDef(index),
              CbbColors.varPicker(CbbColors.rapmCollinPlayer, n * 0.01)
            ),
          ])
        )
      );
      // Table vals:
      const condIndicesTitle = `"RAPM Impact"`;
      const buildCollinRow = (row: number[], title: string) => {
        return GenericTableOps.buildDataRow(
          _.fromPairs(
            row
              .map(
                (n: number, index: number) =>
                  [collinCol(index), { value: n }] as [string, any]
              )
              .concat(title ? [["title", title]] : [])
          ),
          GenericTableOps.defaultFormatter,
          GenericTableOps.defaultCellMeta,
          title != condIndicesTitle ? undefined : collinTableFields_CondIndices
        );
      };
      const collinTableData = [
        buildCollinRow(lineupCombos, condIndicesTitle),
      ].concat(
        _.toPairs(rapmInfo.preProcDiags.playerCombos).map(
          (pRow: [string, number[]]) => {
            return buildCollinRow(pRow[1], pRow[0]);
          }
        )
      );

      // Regression Analysis

      const buildData = (attempt: any) => {
        return {
          lambda: attempt.ridgeLambda.toFixed(3),
          ..._.fromPairs(
            ctx.colToPlayer.map((p: string, i: number) => {
              return [p, attempt.results[i]];
            })
          ),
        };
      };
      const offLineData = rapmInfo.offInputs.prevAttempts.map(buildData);
      const defLineData = rapmInfo.defInputs.prevAttempts.map(buildData);

      const lines = ctx.colToPlayer.map((p: string, i: number) => {
        return (
          <Line
            type="monotone"
            isAnimationActive={false}
            dataKey={p}
            key={"" + i}
            stroke={categoricalPalette[i % categoricalPalette.length]}
          />
        );
      });

      return (
        <section>
          <h4>Global RAPM Diagnostics View</h4>
          <h5>Player correlation table</h5>
          <span>
            <em>
              <ul>
                <li>
                  Shows the{" "}
                  <a
                    target="_blank"
                    href="https://en.wikipedia.org/wiki/Pearson_correlation_coefficient"
                  >
                    Pearson Correlation Coefficient
                  </a>
                  &nbsp;between any two players. This can be thought of as "how
                  similar would the changes be to the two players' RAPMs from a
                  random change in the lineup stats?"
                </li>
                <ul>
                  <li>
                    (eg 100%: the changes would be proportional to each other;
                    0%: the changes would be unrelated to each other)
                  </li>
                </ul>
              </ul>
            </em>
          </span>
          <Container>
            <Col xs={8}>
              <GenericTable
                responsive={false}
                tableCopyId="correlDiags"
                tableFields={correlTableFields}
                tableData={correlTableData}
              />
            </Col>
          </Container>
          <span>
            <em>
              <ul>
                <li>
                  The "Adaptive correlation weight" is simply the
                  minutes-weighted average of each player's correlation with his
                  teammates. It is used to determine a prior in the offensive
                  RAPM calculations (see under player diagnostics above), ie
                  replacing a sane % of "pure RAPM" with a production value
                  determined from the player's box score metrics.
                </li>
              </ul>
            </em>
          </span>
          <h5>Filtered-out player diagnostics</h5>
          <ul>
            {tmpRemovedPlayersPhase1.length > 0 ? (
              <span>
                <li>
                  Players with too few possessions (threshold [
                  <b>{(playerThreshold * 100).toFixed(1)}%</b>]):
                </li>
                <ul>
                  <li>{tmpRemovedPlayersPhase1.join(";")}</li>
                </ul>
              </span>
            ) : (
              <span>
                <li>
                  No players filtered out based on possession % (threshold [
                  <b>{(playerThreshold * 100).toFixed(1)}%</b>])
                </li>
              </span>
            )}
          </ul>
          <h5>Lineup collinearity diagnostics</h5>
          <span>
            <em>
              <ul>
                <li>
                  In the context of RAPM, "lineup collinearity" means that
                  players are in such a similar combination of lineups that it
                  is hard for the math to distinguish correctly between their
                  contributions. The more "collinear" the lineups are, the more
                  sensitive the raw RAPM is to small changes in lineup stats,
                  and therefore the more aggressive the regression toward the
                  "prior estimates" needs to be.
                </li>

                <li>
                  In the table below, each "LC" is a combination of lineups, and
                  the first row a measure of its impact on the raw RAPM. For
                  each "LC" we show a % for each player indicating how much they
                  are affected by the collinearity of that combination.
                </li>
              </ul>
            </em>
          </span>
          <Container>
            <Col xs={8}>
              <GenericTable
                responsive={false}
                tableCopyId="collinDiags"
                tableFields={collinTableFields}
                tableData={collinTableData}
              />
            </Col>
          </Container>
          <span>
            <em>
              <ul>
                <li>
                  A good rule of thumb is that an "impact" of <b>15-30</b> is
                  slightly worrying, from <b>30-100+</b> increasingly
                  problematic. For a problematic "LC", a player score of{" "}
                  <b>50%</b> onwards indicates an increasing unreliability of
                  their raw RAPM share with other affected players.
                </li>
                <li>
                  (For a purely mathematical explanation see bullet 6 of{" "}
                  <a
                    target="_blank"
                    href="https://en.wikipedia.org/wiki/Multicollinearity#Detection_of_multicollinearity"
                  >
                    this section of the wiki article.
                  </a>
                  )
                </li>
              </ul>
            </em>
          </span>
          <h5>Regression diagnostics</h5>
          <span>
            <em>
              <ul>
                <li>
                  As the regression factor increases you can see the total RAPM
                  (raw + prior) settles down to a value dominated by the prior.
                  The aim is to pick a regression factor where the raw RAPM has
                  "settled down" but still dominates in the prior in the overall
                  calculation.
                </li>
                <li>
                  More information about raw vs prior (at the selected "lambda")
                  is given in the player diagnostics above.
                </li>
              </ul>
            </em>
          </span>
          <Container>
            <Row>
              <Col>
                <LineChart
                  width={450}
                  height={400}
                  data={offLineData}
                  margin={{ top: 5, right: 0, bottom: 5, left: 0 }}
                >
                  {lines}
                  <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
                  <XAxis dataKey="lambda" />
                  <YAxis>
                    <Label
                      angle={-90}
                      value="Offensive RAPM"
                      position="insideLeft"
                      style={{ textAnchor: "middle" }}
                    />
                  </YAxis>
                  <ReferenceLine
                    x={rapmInfo.offInputs.ridgeLambda.toFixed(3)}
                    stroke="green"
                  >
                    <Label
                      value={`Selected regression 'lambda' [${rapmInfo.offInputs.ridgeLambda.toFixed(
                        3
                      )}]`}
                      position="insideTop"
                    />
                  </ReferenceLine>
                  <Tooltip
                    wrapperStyle={{
                      opacity: "0.8",
                      zIndex: 1000,
                      color: theme == "dark" ? "black" : undefined,
                    }}
                    formatter={(value: any, name: string, props: any) =>
                      value.toFixed(3)
                    }
                    allowEscapeViewBox={{ x: true, y: true }}
                    itemSorter={(item: any) => -item.value}
                  />
                  <Legend />
                </LineChart>
              </Col>
              <Col>
                <LineChart
                  width={450}
                  height={400}
                  data={defLineData}
                  margin={{ top: 5, right: 0, bottom: 5, left: 0 }}
                >
                  {lines}
                  <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
                  <XAxis dataKey="lambda" />
                  <YAxis>
                    <Label
                      angle={-90}
                      value="Defensive RAPM"
                      position="insideLeft"
                      style={{ textAnchor: "middle" }}
                    />
                  </YAxis>
                  <ReferenceLine
                    x={rapmInfo.defInputs.ridgeLambda.toFixed(3)}
                    stroke="green"
                  >
                    <Label
                      value={`Selected regression 'lambda' [${rapmInfo.defInputs.ridgeLambda.toFixed(
                        3
                      )}]`}
                      position="insideTop"
                    />
                  </ReferenceLine>
                  <Tooltip
                    wrapperStyle={{
                      opacity: "0.8",
                      zIndex: 1000,
                      color: theme == "dark" ? "black" : undefined,
                    }}
                    formatter={(value: any, name: string, props: any) =>
                      value.toFixed(3)
                    }
                    allowEscapeViewBox={{ x: true, y: true }}
                    itemSorter={(item: any) => item.value}
                  />
                  <Legend />
                </LineChart>
              </Col>
            </Row>
          </Container>
          (
          <a
            href="#"
            onClick={(event) => {
              event.preventDefault();
              gotoTop();
            }}
          >
            Scroll back to the top
          </a>
          )
        </section>
      );
    } catch (err: unknown) {
      //Temp issue during reprocessing
      return (
        <span>
          Recalculating diags, pending [
          {err instanceof Error ? err.message : err}]
        </span>
      );
    }
  else {
    return <span>(Internal Logic Error: No Diags)</span>; //(only theoretically reachable)
  }
};

export default RapmGlobalDiagView;
