// React imports:
import React, { useState, useEffect } from 'react';

//lodash
import _ from "lodash";

// Bootstrap imports:
import 'bootstrap/dist/css/bootstrap.min.css';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import FormControl from 'react-bootstrap/FormControl';
import InputGroup from 'react-bootstrap/InputGroup';
import Container from 'react-bootstrap/Container';

// Additional components
import Select, { components} from "react-select";
import GenericTable, { GenericTableOps } from "../GenericTable";

// Utils:
import { StatModels, PureStatSet, PlayerCodeId, PlayerCode, PlayerId, Statistic, IndivStatSet, RosterEntry } from "../../utils/StatModels";
import { CommonTableDefs } from "../../utils/tables/CommonTableDefs";
import { CbbColors } from "../../utils/CbbColors";
import { OnBallDefenseModel, RatingUtils } from "../../utils/stats/RatingUtils";

// External Data Model

type Props = {
  show: boolean,
  players: Array<IndivStatSet>,
  onHide: () => void,
  onSave: (onBallDefense: OnBallDefenseModel[]) => void,
  onBallDefense: OnBallDefenseModel[],
  showHelp: boolean
};
const OnBallDefenseModal: React.FunctionComponent<Props> = (
  {players, onSave, onBallDefense, showHelp, ...props}
) => {

  // State:

  /** Idempotent conversion of on ball stats to the TSV - in practice not currently used since they are never persisted */
  const parseInput = (stats: OnBallDefenseModel[]) => {
    const st = stats[0]!;
    const headerRow = "Team,-,Plays,Pts,-,-,-,FGm,-,-,-,-,TOV%,-,-,score%".replace(",", "\t");
    const teamRow = `Team,-,${st.totalPlays},${st.totalPts},-,-,-,-,-,-,-,-,-,-,-,${st.totalScorePct}`.replace(",", "\t");

    const rows = stats.map(s => {
      return `Team,-,${s.plays},${s.pts},-,-,-,${s.fgMiss},-,-,-,-,${s.tovPct},-,-,${s.scorePct}`.replace(",", "\t");
    });

    return `${headerRow}\n${teamRow}\n${rows.join("\n")}`
  };

  const [ inputContents, setInputContents ] = useState(_.isEmpty(onBallDefense) ? "" : parseInput(onBallDefense));
  const [ inputChanged, setInputChanged ] = useState(false);

  const [ parseStatus, setParseStatus ] = useState(<span>
    <li>Awaiting input</li>
    </span>);

  const onApply = (clipboard?: string) => {
    const contents = !_.isNil(clipboard) ? clipboard : inputContents;
    // Analyze incoming data:

    const rowsCols: string[][] =
      contents
        .split("\n").filter(line => _.endsWith(line, "%"))
        .map(line => line.split("\t")).filter(cols => cols.length > 5);

    const maybeTotals = _.startsWith(rowsCols?.[0]?.[0] || "", "#") ? undefined : rowsCols[0];

    const playerNumberToColAndDups = _.transform(rowsCols, (acc, cols) => {
      const playerId = cols[0]!;
      const playerIdComps = playerId.split(" ");
      if (_.startsWith(playerId, "#")) {
        if (acc.unique.hasOwnProperty(playerIdComps[0])) {
          acc.dups.push(playerId);
          acc.dups.push(acc.unique[playerIdComps[0]][0]);
        } else {
          acc.unique[playerIdComps[0]] = cols;
        }
      }
    }, { unique: {} as Record<string, string[]>, dups: [] as string[] });

    const playerNumberToCol = playerNumberToColAndDups.unique;
    const dupColMatches = playerNumberToColAndDups.dups;

    const getMatchingRosterId = (roster: RosterEntry) => {
      const rosterNumber = (roster?.number || "??")
      const rosterNumberNoZero = rosterNumber.replace(/0([0-9])/, "$1");
      const rosterId = "#" + rosterNumberNoZero;
      const rosterIdWithLeadingZero = "#0" + (roster?.number || "??");
      const backupRosterId = "#" + (roster?.alt_number || "??");
      return playerNumberToCol.hasOwnProperty(rosterId) ? rosterId :
              (playerNumberToCol.hasOwnProperty(rosterIdWithLeadingZero) ? rosterIdWithLeadingZero :
                (playerNumberToCol.hasOwnProperty(backupRosterId) ? backupRosterId : undefined));
    };
    const matchedPlayers = _.transform(players, (acc, player, ii) => {
      const matchingRosterId = getMatchingRosterId(player.roster || {});
      if (matchingRosterId) {
        acc.found.push(ii);
        acc.matchedCols.push(matchingRosterId)
      } else {
        acc.notFound.push(ii);
      }
    }, { found: [] as number[], notFound: [] as number[], matchedCols: [] as string[] });

    const colsNotMatched = _.chain(playerNumberToCol).omit(matchedPlayers.matchedCols).keys().value();

    // Convert TSV to data structures

    const parseFloatOrMissing = (s: string | undefined) => {
      const tmp = parseFloat(s || "-");
      return _.isNaN(tmp) ? 0 : tmp;
    };
    const parseRow = (code: string, row: string[]) => {
      return {
        code: code,
        title: row[0],

        pts: parseFloatOrMissing(row[3]),
        plays: parseFloatOrMissing(row[2]),
        scorePct: parseFloatOrMissing(row[15]),
        tovPct: parseFloatOrMissing(row[12]),
        fgMiss: parseFloatOrMissing(row[7]),

        // Fill these in later:
        totalPts: -1, totalScorePct: -1, totalPlays: -1,
        uncatPts: -1, uncatPlays: -1,
        uncatScorePct: -1,  uncatPtsPerScPlay: -1
      };
    };
    const matchedPlayerStats = matchedPlayers.found.map(ii => {
      const player = players[ii]!;
      const matchingRosterId = getMatchingRosterId(player.roster || {}) || "??";
      const row = playerNumberToCol[matchingRosterId] || [];
      const onBallDefense = parseRow(player.code || matchingRosterId, row);
      return onBallDefense;
    });
    const unmatchedPlayerStats = colsNotMatched.map(rosterId => {
      const row = playerNumberToCol[rosterId] || [];
      const onBallDefense = parseRow(rosterId, row);
      return onBallDefense;
    });

    // If there's a totals row we can now add team stats (can still do something otherwise)
    if (maybeTotals) {
      const totalStats = parseRow("totals", maybeTotals);
      RatingUtils.injectUncatOnBallDefenseStats(totalStats, _.concat(matchedPlayerStats, unmatchedPlayerStats));
        //(mutates the objects in these array)
    }

    // Finally, update status
    //TODO: might be nice to collect and report stats errors?

    if (_.isEmpty(matchedPlayers.notFound) && _.isEmpty(colsNotMatched) && maybeTotals && _.isEmpty(dupColMatches)) {
      setParseStatus(
        <span>
          <li>Import succeeded</li>
        </span>
      );
    } else if (!_.isEmpty(matchedPlayers.found)){
      setParseStatus(
        <span>
          <li>Import succeeded, with possible issues: </li>
          <ul>
            {_.isEmpty(dupColMatches) ? null
              :
              <li>Duplicate player numbers in roster. This will likely mess up the stats, so remove one of each pair: [{dupColMatches.join(", ")}].</li>
            }
            {maybeTotals ? null
              :
              <li>Couldn't find team stats, first row was [{rowsCols[0]?.join("|")}] - <b>team stats are needed so ignoring everything else</b></li>
            }
            {_.isEmpty(matchedPlayers.notFound) ?
              <li>Matched all players with recorded stats</li>
              :
              <li>Didn't match these players: {matchedPlayers.notFound.map(index => {
                const player = players[index];
                return `[#${player.roster?.number || "??"} / ${player.code}]`;
              }).join(", ")}</li>
            }
            {_.isEmpty(matchedPlayers.notFound) ?
              null :
              <ul>
                <li><i>Try changing the number to match - if that works, contact me and I'll update my database.</i></li>
              </ul>
            }
            <li>Didn't match these entries from the input: {colsNotMatched.map(key => {
              const col = playerNumberToCol[key];
              return `[${col[0]}]`;
            }).join(", ")}</li>
            {_.isEmpty(matchedPlayers.notFound) ?
              <ul>
                <li><i>(Likely just walk-ons, you can ignore them)</i></li>
              </ul>
              :
              null
            }
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

    onSave(maybeTotals ? matchedPlayerStats : []);
    setInputContents(contents);

    //(handy debug)
    //console.log(JSON.stringify(matchedPlayers) + " / " + colsNotMatched);
  };

  const hasRapm = !_.isEmpty(players[0]?.def_adj_rapm);

  const tableLayout = _.omit({
    "title": GenericTableOps.addTitle("", "", CommonTableDefs.singleLineRowSpanCalculator, "small", GenericTableOps.htmlFormatter),
    "sep-1": GenericTableOps.addColSeparator(),
    "delta": GenericTableOps.addPtsCol("Delta Rtg+", "Difference between the 'classic' Adj Rtg+ and the adjusted for on-ball defense (positive means on-ball stats improve the DRtg)", CbbColors.varPicker(CbbColors.off_diff10_p100_redGreen)),
    "delta_rapm": GenericTableOps.addPtsCol("RAPM comp", "Delta betwen (on-ball) Adj Rtg+ and RAPM - you'd expect 'Delta Rtg+' and 'RAPM comp' to be +vely correlated -  differences are likely to be off-ball (backcourt) or rebounding gravity (frontcourt)", CbbColors.varPicker(CbbColors.off_diff10_p100_redGreen)),
    "sep0": GenericTableOps.addColSeparator(),
    "classic_drtg": GenericTableOps.addPtsCol("Box DRtg", "Box DRtg (no on-ball adjustments)", CbbColors.varPicker(CbbColors.def_pp100)),
    "onball_drtg": GenericTableOps.addPtsCol("new", "DRtg after on-ball adjustments", CbbColors.varPicker(CbbColors.def_pp100)),
    "classic_rtg": GenericTableOps.addPtsCol("Adj Rtg+", "Adjusted Rating+ based on Box DRtg (no on-ball adjustments)", CbbColors.varPicker(CbbColors.def_diff10_p100_redGreen)),
    "onball_rtg": GenericTableOps.addPtsCol("new", "Adjusted Rating+ after on-ball adjustments", CbbColors.varPicker(CbbColors.def_diff10_p100_redGreen)),
    "sep1": GenericTableOps.addColSeparator(),
    "ppp": GenericTableOps.addDataCol(
      "Man PPP", "Points/Play conceded (each possession can include multiple plays)",
      CbbColors.varPicker(CbbColors.alwaysWhite), GenericTableOps.twoDpFormatter
    ),
    "target": GenericTableOps.addPctCol("Man Tgt%", "% of plays where defender was targeted", CbbColors.varPicker(CbbColors.usg_offDef, 1.5)),
    "tov": GenericTableOps.addPctCol("Man TO%", "% of plays where defender forced a TO", CbbColors.varPicker(CbbColors.p_def_TO, 0.25)),
    "score": GenericTableOps.addPctCol("Man Sc%", "% of plays where defender was scored on", CbbColors.varPicker(CbbColors.alwaysWhite)),
    "sep2": GenericTableOps.addColSeparator(),
    "man_ppp": GenericTableOps.addDataCol(
      "Man P/Sc", "Points per scoring play in on-ball defense",
      CbbColors.varPicker(CbbColors.alwaysWhite), GenericTableOps.twoDpFormatter
    ),
    "man_credit": GenericTableOps.addPtsCol("Man Credit", "Stop credit%/100 targeted defensive possessions", CbbColors.varPicker(CbbColors.alwaysWhite)),
    "off_ppp": GenericTableOps.addDataCol(
      "Off P/Sc", "Points per scoring play in off-ball defense",
      CbbColors.varPicker(CbbColors.alwaysWhite), GenericTableOps.twoDpFormatter
    ),
    "off_credit": GenericTableOps.addPtsCol("Off Credit", "Stop credit%/100 off-ball defensive possessions (split equally amongst all 4 off-ball defenders)", CbbColors.varPicker(CbbColors.alwaysWhite)),
    "reb_credit": GenericTableOps.addPtsCol("DRB Credit", "Stop credit%/100 possessions from rebounding", CbbColors.varPicker(CbbColors.alwaysWhite)),
    "sep3": GenericTableOps.addColSeparator(),
    "plays": GenericTableOps.addIntCol("Plays", "Number of targeted plays recorded (each possession can include multiple plays)", CbbColors.varPicker(CbbColors.alwaysWhite)),
    "poss_pct": GenericTableOps.addPctCol("Poss%", "% of team plays where defender is on the court", CbbColors.varPicker(CbbColors.alwaysWhite)),
  }, hasRapm ? [] : ["delta_rapm"]);

  const unassignedData: Record<string, any> = onBallDefense[0] ? {
    title: "Unassigned plays",
    ppp: { value: (onBallDefense[0].uncatPts)/(onBallDefense[0].uncatPlays || 1) },
    target: { value: (onBallDefense[0].uncatPlays)/(onBallDefense[0].totalPlays || 1) },
    score: { value: 0.01*(onBallDefense[0].uncatScorePct) },
    man_ppp: { value: onBallDefense[0].uncatPtsPerScPlay },
    plays: { value: onBallDefense[0].uncatPlays }
    //(no poss_pct)
  } : {};

  const tableData = _.chain(players)
    .filter(p => !_.isNil(p.diag_def_rtg?.onBallDiags) && !_.isNil(p.diag_def_rtg?.onBallDef))
    .map(p => {
      const diag = p.diag_def_rtg!;
      const onBallDiag = diag.onBallDiags!;
      const onBallStats = diag.onBallDef!;
      return {
        title: onBallStats.title,
        classic_drtg: { value: diag.dRtg },
        onball_drtg: { value: onBallDiag.dRtg },
        classic_rtg: { value: diag.adjDRtgPlus },
        onball_rtg: { value: onBallDiag.adjDRtgPlus },
        delta: { value: diag.adjDRtgPlus - onBallDiag.adjDRtgPlus },
        delta_rapm: { value: diag.adjDRtgPlus - ((p.def_adj_rapm as Statistic)?.value || 0) },
        abs_delta: Math.abs(diag.dRtg - onBallDiag.dRtg),
        ppp: { value: onBallStats.pts / (onBallStats.plays || 1) },
        target: { value: onBallDiag.targetedPct },
        score: { value: 0.01*onBallStats.scorePct },
        tov: { value: 0.01*onBallStats.tovPct },
        man_ppp: { value: onBallDiag.playerPtsPerScore },
        man_credit: { value: 100*onBallDiag.onBallStopCredit },
        off_ppp: { value: onBallDiag.weightedPtsPerScore },
        off_credit: { value: 100*onBallDiag.offBallStopCredit },
        reb_credit: { value: 100*onBallDiag.comboRebCredit/(diag.oppoPtsPerScore || 1) },
        plays: { value: onBallStats.plays },
        poss_pct: p.def_team_poss_pct
      } as Record<string, any>;
    }).concat([ unassignedData ]).map(
      o => GenericTableOps.buildDataRow(o, GenericTableOps.defaultFormatter, GenericTableOps.defaultCellMeta)
    ).value();

  return <div><Modal size="xl" {...props}
    onEntered={() => {
      document.body.style.overflow = "scroll";
    }}
  >
    <Modal.Header closeButton>
      <Modal.Title>On Ball Defense</Modal.Title>&nbsp;{showHelp ?
        <a target="_blank" href="https://hoop-explorer.blogspot.com/TODO.html">(?)</a> : null
      }
    </Modal.Header>
    <Modal.Body>
      <Card className="w-100">
        <Card.Header className="small">Input</Card.Header>
        <Card.Body>
          <Form>
            <Form.Row>
              <Form.Group as={Col} sm="12">
                <InputGroup>
                  <FormControl as="textarea"
                    value={inputContents}
                    onPaste={(ev: any) => { onApply(ev.clipboardData.getData('Text')); }}
                    onChange={(ev: any) => { setInputChanged(true); setInputContents(ev.target.value); }}
                    onKeyUp={(ev: any) => { setInputChanged(true); setInputContents(ev.target.value); }}
                    placeholder="Paste on-ball defense table from web page or Google Sheets"
                  />
                </InputGroup>
              </Form.Group>
            </Form.Row>
          </Form>
        </Card.Body>
      </Card>

      <Card className="w-100">
        <Card.Header className="small">Status</Card.Header>
        <Card.Body>
          <Container>
            <Row>
              <ul>
                {parseStatus}
              </ul>
            </Row>
          </Container>
        </Card.Body>
      </Card>

      <Card className="w-100">
        <Card.Header className="small">Player Data</Card.Header>
        <Card.Body>
          <Container>
          {onBallDefense.length == 0 ? <span>No data</span> :
            <GenericTable responsive={true} tableCopyId="onBallDiags" tableFields={tableLayout} tableData={tableData}/>
          }
          </Container>
        </Card.Body>
      </Card>

    </Modal.Body>
    <Modal.Footer>
      <Button disabled={inputContents.length == 0} variant="warning" onClick={() => {
        onApply("");
      }}>Clear</Button>
      <Button disabled={!inputChanged} variant="info" onClick={() => onApply()}>Apply changes</Button>
      <Button variant="primary" onClick={() => props.onHide()}>Done</Button>
    </Modal.Footer>
  </Modal></div>;
};
export default OnBallDefenseModal;
