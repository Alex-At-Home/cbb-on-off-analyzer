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
import {
  ManualOverride,
  ParamPrefixes,
  ParamPrefixesType,
} from "../../utils/FilterModels";
import { CommonTableDefs } from "../../utils/tables/CommonTableDefs";
import { OverrideUtils } from "../../utils/stats/OverrideUtils";
import { Statistic, IndivStatSet, PureStatSet } from "../../utils/StatModels";
import { FeatureFlags } from "../../utils/stats/FeatureFlags";
import ThemedSelect from "./ThemedSelect";

// External Data Model

const shotQualityOverride = "shot_quality";

type Props = {
  tableType: ParamPrefixesType;
  inStats: IndivStatSet[];
  filteredPlayers?: Set<string>;
  statsAsTable: Record<string, any[]>;
  show: boolean;
  onHide: () => void;
  onSave: (overrides: ManualOverride[]) => void;
  overrides: ManualOverride[];
  showHelp: boolean;
  startOverride?: ManualOverride; //(just for testing)
};
const ManualOverrideModal: React.FunctionComponent<Props> = ({
  tableType,
  filteredPlayers,
  inStats,
  statsAsTable,
  onSave,
  overrides,
  showHelp,
  startOverride,
  ...props
}) => {
  //(TODO: lots of work to make this more generic and not just per player)

  const inStatsLabel = (() => {
    switch (tableType) {
      case ParamPrefixes.player:
        return "Player";
      default:
        return "Unknown";
    }
  })();

  const getFirstPlayer = (statList: any[]) => {
    const matchingList = (statList || []).filter(
      (s) => !filteredPlayers || filteredPlayers.has(s.key)
    );
    const first = matchingList?.[0];
    return first
      ? OverrideUtils.getPlayerRowId(first.key, first.onOffKey)
      : undefined;
  };
  useEffect(() => {
    // Show no players, unless there is a single filtered player in which case show them
    if ("" == currInStat && filteredPlayers && 1 == filteredPlayers.size) {
      setCurrInStat(getFirstPlayer(inStats) || "");
    }
  }, [inStats, filteredPlayers]);

  // Starting values:
  const [currInStat, setCurrInStat] = useState(startOverride?.rowId || "");
  const [currStatName, setCurrStatName] = useState(
    startOverride?.statName || ""
  );
  const [oldStatVal, setOldStatVal] = useState(0 as number);
  const [currReplacementAsStr, setCurrReplacementAsStr] = useState(
    _.isNil(startOverride) ? "" : "" + startOverride.newVal
  );

  // Player/lineup/row

  /** Formats a stat set into a label */
  const statToOption = (statSet: IndivStatSet) => {
    if (statSet) {
      const labelAndVal = OverrideUtils.getPlayerRowId(
        statSet.key,
        statSet.onOffKey || "Baseline"
      );
      return [
        {
          label: labelAndVal,
          value: labelAndVal,
        },
      ];
    } else return [];
  };

  /** From stat set label to stat set */
  const valueToStatMap: Record<string, IndivStatSet> = _.fromPairs(
    _.flatMap(inStats, (stat) => statToOption(stat).map((s) => [s.label, stat]))
  );

  // Lits of metrics

  const isShotSelectionOverride = (statName: string) =>
    _.startsWith(statName, OverrideUtils.shotSelectionPrefix);
  const threePtShotSelection = "aggro_3p";

  const metricsMap: Record<string, string> = FeatureFlags.isActiveWindow(
    FeatureFlags.advancedPlayerEditor
  )
    ? {
        ...OverrideUtils.getOverridableStats(tableType),
        [threePtShotSelection]: "3P shot aggression%+",
      }
    : {
        ...OverrideUtils.getOverridableStats(tableType),
      };
  // Removed this from metricsMap since haven't touched since 2020ish and it's likely SQ format has changed
  //[shotQualityOverride]: "Import Shot Quality FG%",

  const metricToOption = (valLabel: [string, string]) => {
    if (valLabel[0]) {
      return [{ label: valLabel[1], value: valLabel[0] }];
    } else {
      return [];
    }
  };

  // Control

  const getOldVal = (playerStat: Statistic | undefined) => {
    return (
      (_.isNil(playerStat?.old_value)
        ? playerStat?.value
        : playerStat?.old_value) || 0
    );
  };

  /** If the entry can be added to the list */
  const isDefined = (inStat: string, statName: string) =>
    inStat != "" && statName != "";

  /** When the player/stat is changed, recalc the stats */
  const updateValues = (inStat: string, statName: string) => {
    if (inStat != "" && isShotSelectionOverride(statName)) {
      const maybeExistingOverride = _.find(
        overrides,
        (o) => o.rowId == inStat && o.statName == statName
      );
      const startingVal = 100.0;
      const currVal =
        100.0 *
        (_.isNil(maybeExistingOverride) ? 1.0 : maybeExistingOverride.newVal);
      setOldStatVal(startingVal);
      setCurrReplacementAsStr(currVal.toFixed(1));
    } else if (isDefined(inStat, statName)) {
      const playerStat = valueToStatMap?.[inStat]?.[statName] as
        | Statistic
        | undefined;
      const startingVal = 100 * getOldVal(playerStat);
      const currVal = 100 * (playerStat?.value || 0);
      setOldStatVal(startingVal);
      setCurrReplacementAsStr(currVal.toFixed(1));
    }
  };

  const insertOrUpdate = (newObjOrObjs: ManualOverride | ManualOverride[]) => {
    const newObjs = _.isArray(newObjOrObjs) ? newObjOrObjs : [newObjOrObjs];
    const toReplace = _.flatMap(newObjs, (newObj) => {
      const currObj = _.find(
        overrides,
        (o) => o.rowId == newObj.rowId && o.statName == newObj.statName
      );
      if (currObj) {
        currObj.newVal = newObj.newVal;
        currObj.use = newObj.use;
        return [];
      } else {
        return [newObj];
      }
    });
    onSave(overrides.concat(toReplace));
  };

  /** Update the overrides list with the new value */
  const addToOverrides = () => {
    const newObj = {
      rowId: currInStat,
      statName: currStatName,
      newVal: parseFloat(currReplacementAsStr) * 0.01, //(at some point this might need to depend on stat name)
      use: true,
    };
    insertOrUpdate(newObj);
  };

  /** Remove an override */
  const removeOverride = (toRemove: ManualOverride) => {
    const newOverrideSet = overrides.filter(
      (over) =>
        toRemove.rowId != over.rowId || toRemove.statName != over.statName
    );
    onSave(newOverrideSet);
  };

  /** Remove an override */
  const selectOverride = (select: ManualOverride) => {
    setCurrInStat(select.rowId);
    setCurrStatName(select.statName);
    updateValues(select.rowId, select.statName);
  };

  // Shot Quality override logic

  const parseShotQualityStats = (
    playTypes: string[],
    shotQualityPpp: string[],
    counts: string[]
  ) => {
    const state = {
      av_rim: 0,
      av_mid: 0,
      av_3p: 0,
      total_rim: 0,
      total_mid: 0,
      total_3p: 0,
    };
    const combined = _.zip(playTypes, shotQualityPpp, counts);
    _.transform(
      combined,
      (acc, type_pts) => {
        const playType = type_pts[0] || "";
        const sqPpp = parseFloat(type_pts[1] || "");
        const count = parseInt(type_pts[2] || "");
        if (playType && !_.isNaN(sqPpp) && !_.isNaN(count)) {
          if (playType.indexOf("Three") >= 0) {
            acc.total_3p += count;
            acc.av_3p += count * sqPpp;
          } else if (playType.indexOf("Midrange") >= 0) {
            acc.total_mid += count;
            acc.av_mid += count * sqPpp;
          } else if (playType != "") {
            acc.total_rim += count;
            acc.av_rim += count * sqPpp;
          }
        }
      },
      state
    );
    return state;
  };

  const [shotQualityContents, setShotQualityContents] = useState("");
  const [shotQualityChanged, setShotQualityChanged] = useState(false);
  const onShotQualityApply = (clipboard?: string) => {
    const contents = !_.isNil(clipboard) ? clipboard : shotQualityContents;
    // Analyze incoming data:
    const rowsCols: string[][] = contents
      .split("\n")
      .map((line) => _.drop(line.split("\t"), 1));

    const shotQualityState = parseShotQualityStats(
      rowsCols[0] || [],
      rowsCols[1] || [],
      rowsCols[3] || []
    );

    const sqOverrides = _.flatten([
      shotQualityState.total_rim > 0
        ? [
            {
              rowId: currInStat,
              statName: OverrideUtils.shotQualityRim,
              newVal:
                (shotQualityState.av_rim * 0.5) / shotQualityState.total_rim,
              use: true,
            },
          ]
        : [],
      shotQualityState.total_mid > 0
        ? [
            {
              rowId: currInStat,
              statName: OverrideUtils.shotQualityMid,
              newVal:
                (shotQualityState.av_mid * 0.5) / shotQualityState.total_mid,
              use: true,
            },
          ]
        : [],
      shotQualityState.total_3p > 0
        ? [
            {
              rowId: currInStat,
              statName: OverrideUtils.shotQualityThree,
              newVal: shotQualityState.av_3p / shotQualityState.total_3p / 3,
              use: true,
            },
          ]
        : [],
    ]);

    insertOrUpdate(sqOverrides);

    setShotQualityContents(contents);
  };

  // Table building:

  const manualOverridesTable = {
    title: GenericTableOps.addTitle(
      "Player",
      "The player / subset",
      CommonTableDefs.singleLineRowSpanCalculator,
      "",
      GenericTableOps.htmlFormatter
    ),
    stat: GenericTableOps.addTitle(
      "Statistic",
      "The overriden statistic",
      CommonTableDefs.singleLineRowSpanCalculator,
      "",
      GenericTableOps.htmlFormatter
    ),
    sep0: GenericTableOps.addColSeparator(),
    to: GenericTableOps.addPctCol(
      "New",
      "The new value of the statistic for the player",
      GenericTableOps.defaultColorPicker
    ),
    from: GenericTableOps.addPctCol(
      "Original",
      "The actual value of the statistic for the player",
      GenericTableOps.defaultColorPicker
    ),
  };

  const tableData = _.chain(overrides)
    .sortBy(["rowId", "statName"])
    .flatMap((over) => {
      const statNameKey = OverrideUtils.shotQualityKeyToKey(over.statName);

      const playerRow = valueToStatMap[over.rowId];
      if (playerRow) {
        const oldVal =
          over.statName == OverrideUtils.shotQualityRim
            ? OverrideUtils.getOldRimTs(playerRow)
            : isShotSelectionOverride(statNameKey)
            ? 1.0 //(shot selection originals are always 100%)
            : getOldVal(playerRow[statNameKey]);

        return [
          GenericTableOps.buildDataRow(
            {
              title: (
                <span>
                  {over.use ? over.rowId : <del>{over.rowId}</del>}
                  <br />
                  <a
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      insertOrUpdate({ ...over, use: !over.use });
                    }}
                  >
                    {over.use ? "(disable)" : "(enable)"}
                  </a>
                  &nbsp;
                  <a
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      removeOverride(over);
                      return false;
                    }}
                  >
                    (delete)
                  </a>
                  &nbsp;
                  {over.rowId == currInStat && over.statName == currStatName ? (
                    <i>(select)</i>
                  ) : (
                    <a
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        selectOverride(over);
                      }}
                    >
                      (select)
                    </a>
                  )}
                </span>
              ),
              stat: (
                <span>
                  {metricsMap[over.statName] ||
                    OverrideUtils.shotQualityMetricMap[over.statName] ||
                    over.statName}
                </span>
              ),
              to: { value: over.newVal },
              from: { value: oldVal },
            },
            GenericTableOps.defaultFormatter,
            GenericTableOps.defaultCellMeta
          ),
        ];
      } else {
        return [];
      }
    })
    .value();

  // Grouping for the player selector list:

  /** The two sub-headers for the dropdown */
  const groupedOptions = filteredPlayers
    ? [
        {
          label: "Filtered",
          options: _.flatMap(inStats, (stat) =>
            filteredPlayers.has(stat.key) ? statToOption(stat) : []
          ),
        },
        {
          label: "All Players",
          options: _.flatMap(inStats, (stat) =>
            !filteredPlayers.has(stat.key) ? statToOption(stat) : []
          ),
        },
      ]
    : _.flatMap(inStats, (stat) => statToOption(stat));
  /** The sub-header builder */
  const formatGroupLabel = (data: any) => (
    <div>
      <span>{data.label}</span>
    </div>
  );

  // View

  const hasRapm = !_.isNil((inStats[0] as PureStatSet)?.off_adj_rapm?.value);
  const statsTableFields = CommonTableDefs.onOffIndividualTable(
    true,
    false,
    false,
    hasRapm
  ); //(expanded view, abs poss count, rating not prod)

  return (
    <div>
      <Modal
        size="lg"
        {...props}
        onEntered={() => {
          document.body.style.overflow = "scroll";
        }}
      >
        <Modal.Header closeButton>
          <Modal.Title>Manual Overrides</Modal.Title>&nbsp;
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
            <Card.Header className="small">Add New Override</Card.Header>
            <Card.Body>
              <Form>
                <Form.Row>
                  <Form.Group as={Col} sm="12">
                    <InputGroup>
                      <InputGroup.Prepend>
                        <InputGroup.Text id="inStat">
                          {inStatsLabel}
                        </InputGroup.Text>
                      </InputGroup.Prepend>
                      <ThemedSelect
                        className="w-75"
                        value={statToOption(valueToStatMap[currInStat])}
                        options={groupedOptions}
                        onChange={(option: any) => {
                          const val = (option as any)?.value;
                          if (val) {
                            setCurrInStat(val);
                            updateValues(val, currStatName);
                          }
                        }}
                        formatGroupLabel={
                          filteredPlayers ? formatGroupLabel : undefined
                        }
                      />
                    </InputGroup>
                  </Form.Group>
                </Form.Row>
                <Form.Row>
                  <Form.Group as={Col} sm="10">
                    <InputGroup>
                      <InputGroup.Prepend>
                        <InputGroup.Text id="inStatKey">Metric</InputGroup.Text>
                      </InputGroup.Prepend>
                      <ThemedSelect
                        className="w-75"
                        value={metricToOption([
                          currStatName,
                          metricsMap[currStatName],
                        ])}
                        options={_.chain(metricsMap)
                          .toPairs()
                          .flatMap((stat) => metricToOption(stat))
                          .value()}
                        onChange={(option: any) => {
                          const val = (option as any)?.value;
                          if (val) {
                            setCurrStatName(val);
                            updateValues(currInStat, val);
                          }
                        }}
                      />
                    </InputGroup>
                  </Form.Group>
                  {currStatName == shotQualityOverride ? (
                    <Form.Group as={Col} sm="2">
                      <InputGroup>
                        <Button
                          variant="info"
                          disabled={!shotQualityChanged}
                          onClick={() => onShotQualityApply()}
                        >
                          Apply
                        </Button>
                      </InputGroup>
                    </Form.Group>
                  ) : null}
                </Form.Row>
                {currStatName == shotQualityOverride ? (
                  <Form.Row>
                    <Form.Group as={Col} sm="12">
                      <InputGroup>
                        <FormControl
                          as="textarea"
                          value={shotQualityContents}
                          onPaste={(ev: any) => {
                            onShotQualityApply(
                              ev.clipboardData.getData("Text")
                            );
                          }}
                          onChange={(ev: any) => {
                            setShotQualityChanged(true);
                            setShotQualityContents(ev.target.value);
                          }}
                          onKeyUp={(ev: any) => {
                            setShotQualityChanged(true);
                            setShotQualityContents(ev.target.value);
                          }}
                          placeholder="Paste Player Shot Quality 'Play Type' Stats"
                        />
                      </InputGroup>
                    </Form.Group>
                  </Form.Row>
                ) : (
                  <Form.Row>
                    <InputGroup as={Col} sm="4">
                      <InputGroup.Prepend>
                        <InputGroup.Text id="from">From</InputGroup.Text>
                      </InputGroup.Prepend>
                      <Form.Control disabled value={oldStatVal.toFixed(1)} />
                      <InputGroup.Append>
                        <InputGroup.Text id="pct">%</InputGroup.Text>
                      </InputGroup.Append>
                    </InputGroup>
                    <InputGroup as={Col} sm="4">
                      <InputGroup.Prepend>
                        <InputGroup.Text id="to">To</InputGroup.Text>
                      </InputGroup.Prepend>
                      <Form.Control
                        disabled={!isDefined(currInStat, currStatName)}
                        onChange={(ev: any) => {
                          if (/^[0-9.]*$/.exec(ev.target.value || "")) {
                            setCurrReplacementAsStr(ev.target.value);
                          }
                        }}
                        placeholder="eg 33.3"
                        value={currReplacementAsStr}
                      />
                      <InputGroup.Append>
                        <InputGroup.Text id="pct2">%</InputGroup.Text>
                      </InputGroup.Append>
                    </InputGroup>
                    <InputGroup as={Col} sm="2">
                      <Button
                        variant="outline-secondary"
                        disabled={
                          _.isNaN(parseFloat(currReplacementAsStr)) ||
                          !isDefined(currInStat, currStatName)
                        }
                        onClick={() => addToOverrides()}
                      >
                        +
                      </Button>
                    </InputGroup>
                  </Form.Row>
                )}
              </Form>
            </Card.Body>
          </Card>

          <Card className="w-100">
            <Card.Header className="small">
              Selected Player Overriden Stats
            </Card.Header>
            <Card.Body>
              <Container>
                <Row>
                  <Col xs={12}>
                    <GenericTable
                      tableCopyId="overrideEffectsTable"
                      tableFields={statsTableFields}
                      tableData={statsAsTable[currInStat] || []}
                    />
                  </Col>
                </Row>
              </Container>
            </Card.Body>
          </Card>

          <Card className="w-100">
            <Card.Header className="small">
              Existing Overrides &nbsp;
              <a
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  overrides.forEach((over) => {
                    if (!over.use) insertOrUpdate({ ...over, use: true });
                  });
                }}
              >
                (enable all)
              </a>
              &nbsp;
              <a
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  overrides.forEach((over) => {
                    if (over.use) insertOrUpdate({ ...over, use: false });
                  });
                }}
              >
                (disable all)
              </a>
            </Card.Header>
            <Card.Body>
              <Container>
                <Row>
                  <Col xs={11}>
                    <GenericTable
                      tableCopyId="overridesTable"
                      tableFields={manualOverridesTable}
                      tableData={tableData}
                    />
                  </Col>
                </Row>
              </Container>
            </Card.Body>
          </Card>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => props.onHide()}>
            Exit
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};
export default ManualOverrideModal;
