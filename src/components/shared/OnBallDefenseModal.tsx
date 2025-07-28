// React imports:
import React, { useState, useEffect } from "react";

//lodash
import _ from "lodash";

// Bootstrap imports:

import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import FormControl from "react-bootstrap/FormControl";
import InputGroup from "react-bootstrap/InputGroup";
import Container from "react-bootstrap/Container";

// Additional components
//@ts-ignore
import Select, { components } from "react-select";
import GenericTable, { GenericTableOps } from "../GenericTable";

// Utils:
import { CommonTableDefs } from "../../utils/tables/CommonTableDefs";
import { CbbColors } from "../../utils/CbbColors";
import { OnBallDefenseModel } from "../../utils/stats/RatingUtils";
import { OnBallDefenseUtils } from "../../utils/stats/OnBallDefenseUtils";
import { IndivStatSet, PureStatSet } from "../../utils/StatModels";
//@ts-ignore
import Input from "react-select/src/components/Input";

// External Data Model

type Props = {
  show: boolean;
  players: IndivStatSet[];
  onHide: () => void;
  onSave: (onBallDefense: OnBallDefenseModel[]) => void;
  onBallDefense: OnBallDefenseModel[];
  showHelp: boolean;
};
const OnBallDefenseModal: React.FunctionComponent<Props> = ({
  players,
  onSave,
  onBallDefense,
  showHelp,
  ...props
}) => {
  // State:

  const [inputContents, setInputContents] = useState("");
  const [inputChanged, setInputChanged] = useState(false);

  const [parseStatus, setParseStatus] = useState(
    <span>
      <li>Awaiting input</li>
    </span>
  );

  const onApply = (clipboard?: string) => {
    const contents = !_.isNil(clipboard) ? clipboard : inputContents;
    // Analyze incoming data:

    const res = OnBallDefenseUtils.parseContents(players, contents);

    // Finally, update status
    //TODO: might be nice to collect and report stats errors?

    if (
      _.isEmpty(res.matchedPlayers.notFound) &&
      _.isEmpty(res.colsNotMatched) &&
      res.maybeTotals &&
      _.isEmpty(res.dupColMatches)
    ) {
      setParseStatus(
        <span>
          <li>Import succeeded</li>
        </span>
      );
    } else if (!_.isEmpty(res.matchedPlayers.found)) {
      setParseStatus(
        <span>
          <li>Import succeeded, with possible issues: </li>
          <ul>
            {
              // Legacy - don't use this any more
              /*_.isEmpty(res.dupColMatches) ? null
              :
              <li>Duplicate player numbers in roster. This will likely mess up the stats, so remove one of each pair: [{res.dupColMatches.join(", ")}].</li>
            */
            }
            {res.maybeTotals ? null : (
              <li>
                Couldn't find team stats, first row was [
                {res.rowsCols[0]?.join("|")}] -{" "}
                <b>team stats are needed so ignoring everything else</b>
              </li>
            )}
            {_.isEmpty(res.matchedPlayers.notFound) ? (
              <li>Matched all players with recorded stats</li>
            ) : (
              <li>
                Didn't match these players:{" "}
                {res.matchedPlayers.notFound
                  .map((index) => {
                    const player = players[index];
                    return `[${player.key || "??"}]`;
                    //Legacy
                    // return `[#${player.roster?.number || "??"} / ${player.code}]`;
                  })
                  .join(", ")}
              </li>
            )}
            {_.isEmpty(res.matchedPlayers.notFound) ? null : (
              <ul>
                <li>
                  <i>
                    Edit the names above to match and "Apply Changes" below; or
                    increase "Min Possessions" in Synergy and re-export/upload.
                  </i>
                </li>
                <li>
                  <i>(Or, ignore if they are walk-ons or deep bench players)</i>
                </li>
                {
                  //Legacy
                  //<li><i>Try changing the number to match - if that works, contact me and I'll update my database.</i></li>
                }
              </ul>
            )}
            {
              //Legacy
              /*<li>Didn't match these entries from the input: {res.colsNotMatched.map(key => {
              const col = res.playerNumberToCol[key];
              return `[${col[0]}]`;
            }).join(", ")}</li>*/
              _.isEmpty(res.colsNotMatched) ? null : (
                <li>
                  Didn't match these entries from the input:{" "}
                  {res.colsNotMatched.map((p) => `[${p}]`).join(", ")}
                </li>
              )
            }
            {_.isEmpty(res.colsNotMatched) ? null : _.isEmpty(
                res.matchedPlayers.notFound
              ) ? (
              <ul>
                <li>
                  <i>(Likely just walk-ons, you can ignore them)</i>
                </li>
              </ul>
            ) : (
              <ul>
                <li>
                  <i>Edit the names above to match and "Apply Changes" below</i>
                </li>
              </ul>
            )}
          </ul>
        </span>
      );
    } else if (contents) {
      setParseStatus(
        <span>
          <li>Import failure, no players matched.</li>
        </span>
      );
    } else {
      setParseStatus(
        <span>
          <li>Awaiting input</li>
        </span>
      );
    }

    onSave(res.maybeTotals ? res.matchedPlayerStats : []);
    setInputContents(contents);

    //(handy debug)
    //console.log(JSON.stringify(res.matchedPlayers) + " / " + res.colsNotMatched);
  };

  const hasRapm = (players[0] as PureStatSet)?.def_adj_rapm?.value;

  const tableLayout = _.omit(
    {
      title: GenericTableOps.addTitle(
        "",
        "",
        CommonTableDefs.singleLineRowSpanCalculator,
        "small",
        GenericTableOps.htmlFormatter
      ),
      "sep-1": GenericTableOps.addColSeparator(),
      delta: GenericTableOps.addPtsCol(
        "Delta Rtg+",
        "Difference between the 'classic' Adj Rtg+ and the adjusted for on-ball defense (positive means on-ball stats improve the DRtg)",
        CbbColors.varPicker(CbbColors.off_diff10_p100_redGreen)
      ),
      delta_rapm: GenericTableOps.addPtsCol(
        "RAPM comp",
        "Delta betwen (on-ball) Adj Rtg+ and RAPM - you'd expect 'Delta Rtg+' and 'RAPM comp' to be very +correlated -  differences are likely to be off-ball/help defense (backcourt) or rebounding gravity (frontcourt)",
        CbbColors.varPicker(CbbColors.off_diff10_p100_redGreen)
      ),
      sep0: GenericTableOps.addColSeparator(),
      classic_drtg: GenericTableOps.addPtsCol(
        "Box DRtg",
        "Box DRtg (no on-ball adjustments)",
        CbbColors.varPicker(CbbColors.def_pp100)
      ),
      onball_drtg: GenericTableOps.addPtsCol(
        "new",
        "DRtg after on-ball adjustments",
        CbbColors.varPicker(CbbColors.def_pp100)
      ),
      classic_rtg: GenericTableOps.addPtsCol(
        "Adj Rtg+",
        "Adjusted Rating+ based on Box DRtg (no on-ball adjustments)",
        CbbColors.varPicker(CbbColors.def_diff10_p100_redGreen)
      ),
      onball_rtg: GenericTableOps.addPtsCol(
        "new",
        "Adjusted Rating+ after on-ball adjustments",
        CbbColors.varPicker(CbbColors.def_diff10_p100_redGreen)
      ),
      sep1: GenericTableOps.addColSeparator(),
      target: GenericTableOps.addPctCol(
        "Ball Tgt%",
        "% of plays where on-ball defender was targeted",
        CbbColors.varPicker(CbbColors.usg_offDef, 1.5)
      ),
      ppp: GenericTableOps.addDataCol(
        "Ball PPP",
        "On-Ball Points/Play conceded (each possession can include multiple plays)",
        CbbColors.varPicker(CbbColors.applyThemedBackground),
        GenericTableOps.twoDpFormatter
      ),
      eff_ppp: GenericTableOps.addDataCol(
        "Eff PPP",
        "On-Ball Points/Play adjusted to take into account that missed field goals can be rebounded",
        CbbColors.varPicker(CbbColors.def_ppp),
        GenericTableOps.twoDpFormatter
      ),
      "sep1.5": GenericTableOps.addColSeparator(),
      tov: GenericTableOps.addPctCol(
        "Ball TO%",
        "% of plays where defender forced a TO",
        CbbColors.varPicker(CbbColors.p_def_TO, 0.25)
      ),
      sf: GenericTableOps.addPctCol(
        "Ball SF%",
        "% of plays where defender fouled a shooter",
        CbbColors.varPicker(CbbColors.p_def_TO, 0.25)
      ),
      sep2: GenericTableOps.addColSeparator(),
      ball_drtg: GenericTableOps.addPtsCol(
        "Ball DRtg",
        "The approximate Defensive Rating taking only on-ball defense (and rebounds) into account",
        CbbColors.varPicker(CbbColors.def_pp100)
      ),
      off_drtg: GenericTableOps.addPtsCol(
        "Off DRtg",
        "The approximate Defensive Rating taking only off-ball defense (and rebounds) into account",
        CbbColors.varPicker(CbbColors.def_pp100)
      ),
      reb_credit: GenericTableOps.addPtsCol(
        "DRB Bonus",
        "The gain/loss to Defensive Rating due to a player's rebounding",
        CbbColors.varPicker(CbbColors.def_diff10_p100_redGreen)
      ),
      sep3: GenericTableOps.addColSeparator(),
      plays: GenericTableOps.addIntCol(
        "Plays",
        "Number of targeted plays recorded (each possession can include multiple plays)",
        CbbColors.varPicker(CbbColors.applyThemedBackground)
      ),
      poss: GenericTableOps.addPctCol(
        "Poss%",
        "% of team possessions the player is on the floor",
        CbbColors.varPicker(CbbColors.applyThemedBackground)
      ),
    },
    hasRapm ? [] : ["delta_rapm"]
  );

  const unassignedData: Record<string, any> = onBallDefense[0]
    ? {
        title: "Unassigned plays",
        ppp: {
          value: onBallDefense[0].uncatPts / (onBallDefense[0].uncatPlays || 1),
        },
        target: {
          value:
            onBallDefense[0].uncatPlays / (onBallDefense[0].totalPlays || 1),
        },
        tov: {
          value:
            (0.01 * onBallDefense[0].uncatTos) /
            (onBallDefense[0].uncatPlays || 1),
        },
        sf: {
          value:
            (0.01 * onBallDefense[0].uncatSfPlays) /
            (onBallDefense[0].uncatPlays || 1),
        },
        plays: { value: onBallDefense[0].uncatPlays },
      }
    : {};

  const tableData = _.chain(players)
    .filter(
      (p) =>
        !_.isNil(p.diag_def_rtg?.onBallDiags) &&
        !_.isNil(p.diag_def_rtg?.onBallDef)
    )
    .flatMap((p) => {
      const diag = p.diag_def_rtg!;
      const onBallDiag = diag.onBallDiags!;
      const onBallStats = diag.onBallDef!;
      const pctOfTotalPlays =
        (100 * onBallStats.plays) / (onBallStats.totalPlays || 1);
      return pctOfTotalPlays >= 0.25
        ? [
            {
              title: onBallStats.title,
              classic_drtg: { value: diag.dRtg },
              onball_drtg: { value: onBallDiag.dRtg },
              classic_rtg: { value: diag.adjDRtgPlus },
              onball_rtg: { value: onBallDiag.adjDRtgPlus },
              delta: { value: diag.adjDRtgPlus - onBallDiag.adjDRtgPlus },
              delta_rapm: {
                value:
                  diag.adjDRtgPlus -
                  ((p as PureStatSet).def_adj_rapm?.value || 0),
              },
              abs_delta: Math.abs(diag.dRtg - onBallDiag.dRtg),

              ppp: { value: onBallStats.pts / (onBallStats.plays || 1) },
              eff_ppp: { value: onBallDiag.effectivePpp },

              target: { value: onBallDiag.targetedPct },
              // fgMiss: { value: onBallStats.fgMiss/(onBallStats.plays||1) },
              tov: { value: 0.01 * onBallStats.tovPct },
              sf: { value: 0.01 * onBallStats.sfPct },

              ball_drtg: { value: onBallDiag.onBallDRtg },
              off_drtg: { value: onBallDiag.offBallDRtg },
              reb_credit: { value: onBallDiag.reboundDRtgBonus },

              plays: { value: onBallStats.plays },
              poss: { value: p.def_team_poss_pct?.value || 0 },
            } as Record<string, any>,
          ]
        : [];
    })
    .concat([unassignedData])
    .map((o) =>
      GenericTableOps.buildDataRow(
        o,
        GenericTableOps.defaultFormatter,
        GenericTableOps.defaultCellMeta
      )
    )
    .value();

  const asyncReadFile = (file: any) => {
    return new Promise<string>((onResolve, onReject) => {
      var fileReader = new FileReader();
      fileReader.onload = () => {
        onResolve((fileReader.result as string) || "");
      };
      fileReader.onerror = onReject;
      fileReader.readAsText(file);
    });
  };
  const onUpload = (e: any) => {
    const firstTwoFiles = _.take(e.target?.files || [], 2);
    Promise.all(firstTwoFiles.map(asyncReadFile)).then((contents) => {
      const singleFileUploadMode = firstTwoFiles.length == 1; //(user error, or secret format generated by cbb-explorer)
      const combinedContents = singleFileUploadMode
        ? contents?.[0] || ""
        : OnBallDefenseUtils.combineTeamAndPlayerFiles(
            contents?.[0] || "",
            contents?.[1] || ""
          );

      setInputChanged(true);
      setInputContents(combinedContents);
      onApply(combinedContents);
    });
  };

  return (
    <div>
      <Modal
        size="xl"
        {...props}
        onEntered={() => {
          document.body.style.overflow = "scroll";
        }}
      >
        <Modal.Header closeButton>
          <Modal.Title>On Ball Defense</Modal.Title>&nbsp;
          {showHelp ? (
            <a
              target="_blank"
              href="https://hoop-explorer.blogspot.com/TODO.html"
            >
              (?)
            </a>
          ) : null}
        </Modal.Header>
        <Modal.Body>
          <Card className="w-100">
            <Card.Header className="small">Input</Card.Header>
            <Card.Body>
              <Form>
                {_.isEmpty(inputContents) ? (
                  <Form.Row className="mb-2">
                    <Form.Label>
                      <li>In Synergy:</li>
                      <ul>
                        <li>
                          Select{" "}
                          <i>
                            Leaderboards {">"} Player Leaderboards {">"} Player
                            Defensive
                          </i>
                          ; Select Possessions 'Total'; Filter on 'Team'; Export
                          to CSV
                        </li>
                        <li>
                          Select{" "}
                          <i>
                            Leaderboards {">"} Team Leaderboards {">"} Team
                            Defensive
                          </i>
                          ; Select Possessions 'Total'; (Don't have to Filter);
                          Export to CSV
                        </li>
                        <li>
                          <i>
                            (If you have the Shot Quality package, you need to
                            deselect those columns from 'Table View', gear icon)
                          </i>
                        </li>
                      </ul>
                      <li>
                        Then, Choose Files below, and select both exported files
                        (order doesn't matter)
                      </li>
                      <ul>
                        <li>
                          After upload, you will be able to hand edit the
                          combined contents (eg to handle differences in player
                          naming)
                        </li>
                      </ul>
                    </Form.Label>
                  </Form.Row>
                ) : undefined}
                <Form.Row>
                  <Form.Group
                    as={Col}
                    sm="12"
                    controlId="formFile"
                    className="mb-2"
                  >
                    <Form.Control
                      type="file"
                      accept="*.csv"
                      multiple
                      onChange={onUpload}
                    />
                  </Form.Group>
                </Form.Row>
                {_.isEmpty(inputContents) ? undefined : (
                  <Form.Row>
                    <Form.Group as={Col} sm="12">
                      <InputGroup>
                        <FormControl
                          as="textarea"
                          value={inputContents}
                          onPaste={(ev: any) => {
                            onApply(ev.clipboardData.getData("Text"));
                          }}
                          onChange={(ev: any) => {
                            setInputChanged(true);
                            setInputContents(ev.target.value);
                          }}
                          onKeyUp={(ev: any) => {
                            setInputChanged(true);
                            setInputContents(ev.target.value);
                          }}
                          placeholder="Edit names as needed following upload"
                        />
                      </InputGroup>
                    </Form.Group>
                  </Form.Row>
                )}
              </Form>
            </Card.Body>
          </Card>

          <Card className="w-100">
            <Card.Header className="small">Status</Card.Header>
            <Card.Body>
              <Container>
                <Row>
                  <ul>{parseStatus}</ul>
                </Row>
              </Container>
            </Card.Body>
          </Card>

          <Card className="w-100">
            <Card.Header className="small">Player Data</Card.Header>
            <Card.Body>
              <Container>
                {onBallDefense.length == 0 ? (
                  <span>No data</span>
                ) : (
                  <GenericTable
                    responsive={true}
                    tableCopyId="onBallDiags"
                    tableFields={tableLayout}
                    tableData={tableData}
                  />
                )}
              </Container>
            </Card.Body>
          </Card>
        </Modal.Body>
        <Modal.Footer>
          <Button
            disabled={inputContents.length == 0}
            variant="warning"
            onClick={() => {
              onApply("");
            }}
          >
            Clear
          </Button>
          <Button
            disabled={!inputChanged}
            variant="info"
            onClick={() => onApply()}
          >
            Apply changes
          </Button>
          <Button variant="primary" onClick={() => props.onHide()}>
            Done
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};
export default OnBallDefenseModal;
