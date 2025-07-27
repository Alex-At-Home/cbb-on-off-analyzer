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
import Tabs from "react-bootstrap/Tabs";
import Tab from "react-bootstrap/Tab";
import {
  GoodBadOkTriple,
  PlayerEditModel,
  Profiles,
} from "../../utils/stats/TeamEditorUtils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTrash,
  faPause,
  faTimes,
  faFilter,
} from "@fortawesome/free-solid-svg-icons";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
//@ts-ignore
import Select, { components } from "react-select";
import { PositionUtils } from "../../utils/stats/PositionUtils";
import ThemedSelect from "./ThemedSelect";

type Props = {
  overrides?: PlayerEditModel;
  onDelete: () => void;
  onUpdate: (edit: PlayerEditModel | undefined) => void;
  isBench: boolean;
  addNewPlayerMode: boolean;
  enableNil?: boolean;
};

const TeamRosterEditor: React.FunctionComponent<Props> = ({
  overrides,
  onDelete,
  onUpdate,
  isBench,
  addNewPlayerMode,
  enableNil,
}) => {
  // State

  // Starting values:
  const [currName, setCurrName] = useState(overrides?.name || "");
  const [currMins, setCurrMins] = useState(overrides?.mins?.toFixed(1) || "");
  const [currNil, setCurrNil] = useState(overrides?.nil?.toFixed(0) || "");
  const [currProfile, setCurrProfile] = useState(
    (overrides?.profile || (addNewPlayerMode ? "4*" : "Auto")) as Profiles
  );
  const [currPos, setCurrPos] = useState(overrides?.pos || "WG");
  const [currOffAdj, setCurrOffAdj] = useState(
    (overrides?.global_off_adj || 0) as number | undefined
  );
  const [currDefAdj, setCurrDefAdj] = useState(
    -(overrides?.global_def_adj || 0) as number | undefined
  );

  // Start: some ugly logic to handle resetting Fr global adjustments
  useEffect(() => {
    // If we've unset these as part of a Fr reset then set them back again
    if (!_.isNil(overrides?.global_off_adj)) {
      setCurrOffAdj(overrides?.global_off_adj);
    }
    if (!_.isNil(overrides?.global_def_adj)) {
      setCurrDefAdj(-(overrides?.global_def_adj || 0));
    }
  }, [overrides]); // This doesn't get called if overrides is the same value after the reset, so fallback to...

  // ... this will get called normally before the above useEffect; but if we need to change the value, useEffect will get called anyway

  if (_.isNil(currOffAdj) && !_.isNil(overrides?.global_off_adj)) {
    setCurrOffAdj(overrides?.global_off_adj);
  }
  if (_.isNil(currDefAdj) && !_.isNil(overrides?.global_def_adj)) {
    setCurrDefAdj(-(overrides?.global_def_adj || 0));
  }
  // End: some ugly logic to handle resetting Fr global adjustments

  //diag:
  //console.log(`INCOMING STATE: [${currOffAdj}] [${currDefAdj}] ... ${JSON.stringify(overrides || {})}`);

  //TODO: need to handle overrides on top of manually added players (+RS Fr) differently
  // when pausing, the override that gets passed into here is the team one (since allOverrides needs to include that)
  // but then any subsequent changes ... like unpausing! ... will be on top of that, not the manual override
  // For now just block pausing

  const isHandAddedPlayer = !_.isNil(overrides?.name) && !overrides?.fromFrList;
  const isFr = overrides?.fromFrList || false;
  const isHandAddedPlayerOrFr = isHandAddedPlayer || isFr;
  const addOrEditPlayerMode = addNewPlayerMode || isHandAddedPlayerOrFr;
  const editPlayerMode = !addNewPlayerMode && addOrEditPlayerMode;

  // Presentation

  const deleteTooltip = (
    <Tooltip id="deleteTooltip">
      WARNING! Deletes the player from the table. You can add them back from the
      "Add New Player" section.&nbsp; Use the filter option to remove the player
      temporarily.
    </Tooltip>
  );

  const pauseTooltip = (
    <Tooltip id="pauseTooltip">
      Temporarily disables the overrides, so you can easily see the difference
      with them turned on/off.
    </Tooltip>
  );

  const resetTooltip = (
    <Tooltip id="resetTooltip">Removes all overrides.</Tooltip>
  );

  const minsApplyTooltip = (
    <Tooltip id="minsApplyTooltip">
      Override the minutes played per game for this player and recalculate the
      statistics.&nbsp; Clear the field and apply to return to the automatically
      calculated version.
    </Tooltip>
  );

  const nilApplyTooltip = (
    <Tooltip id="nilApplyTooltip">
      Add a manual estimate for the player's NIL old_value.&nbsp; Clear the
      field and apply to return to the automatically calculated version.
    </Tooltip>
  );

  const profileApplyTooltip = (
    <Tooltip id="profileApplyTooltip">
      Override the production to an average level for a Freshmen of the given
      recruiting profile.&nbsp; Select "Auto" and apply to return to the
      automatically calculated version.
    </Tooltip>
  );

  const posApplyTooltip = (
    <Tooltip id="profileApplyTooltip">
      Sets the position role for the player. For display purposes only.
    </Tooltip>
  );

  const globalAdjTooltip = (
    <Tooltip id="globalAdjTooltip">
      If you disagree with the automatic projections, drag the sliders left
      (more pessimistic) / right (more optimistic).&nbsp; Pressing this button
      applies the changes.&nbsp; Note that the adjustments won't be exactly as
      specified due to the details of the algorithm.
    </Tooltip>
  );

  const validPlayer = () => {
    return (
      currName &&
      (!currMins || (parseFloat(currMins) > 0 && parseFloat(currMins) <= 40))
    );
  };

  /** For use in selects */
  function stringToOption(s: string) {
    return { label: s, value: s };
  }
  function profileToOption(s: Profiles) {
    return { label: s, value: s };
  }
  const supportedProfiles: Profiles[] = [
    "5*/Lotto",
    "5*",
    "4*/T40ish",
    "4*",
    "3.5*/T150ish",
    "3*",
    "2*",
  ];

  const [showingMinsError, setShowingMinsError] = useState<boolean>(false);

  return (
    <div>
      <Modal
        show={showingMinsError}
        onHide={() => setShowingMinsError(false)}
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>Input Error</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          If you want to zero a player's minutes, just click the 'Filter' button
          (<FontAwesomeIcon icon={faFilter} />) to the far right of the player
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowingMinsError(false)}>
            Umm OK, I guess
          </Button>
        </Modal.Footer>
      </Modal>

      <Container>
        <Row>
          <Col xs={12}>
            <Card>
              <Container>
                {addOrEditPlayerMode ? (
                  <Row className="mt-2">
                    <Col xs={1} />
                    <Col xs={8}>
                      <InputGroup>
                        <InputGroup.Prepend>
                          <InputGroup.Text id="playerName">
                            Player Name
                          </InputGroup.Text>
                        </InputGroup.Prepend>
                        <Form.Control
                          disabled={!addNewPlayerMode}
                          onChange={(ev: any) => {
                            setCurrName(ev.target.value || "");
                          }}
                          placeholder="LastName, FirstName"
                          value={currName}
                        />
                      </InputGroup>
                    </Col>
                    {addNewPlayerMode ? (
                      <Col>
                        <Button
                          disabled={!validPlayer()}
                          onClick={(ev: any) => {
                            onUpdate({
                              name: currName,
                              mins: currMins ? parseFloat(currMins) : undefined,
                              pos: currPos,
                              profile: currProfile,
                              global_off_adj: currOffAdj
                                ? currOffAdj
                                : undefined,
                              global_def_adj: currDefAdj
                                ? -currDefAdj
                                : undefined,
                            });
                            setCurrName("");
                          }}
                        >
                          Add
                        </Button>
                      </Col>
                    ) : null}
                  </Row>
                ) : null}
                <Row className="mt-2">
                  <Col xs={1} />
                  <Col xs={3}>
                    <InputGroup>
                      <InputGroup.Prepend>
                        <InputGroup.Text id="minPct">Fix MPG</InputGroup.Text>
                      </InputGroup.Prepend>
                      <Form.Control
                        disabled={overrides?.pause}
                        onChange={(ev: any) => {
                          if (/^[0-9.]*$/.exec(ev.target.value || "")) {
                            setCurrMins(ev.target.value || "");
                          }
                        }}
                        placeholder="eg 33.3"
                        value={currMins}
                      />
                    </InputGroup>
                  </Col>
                  <Col xs={1} className="pt-1">
                    {addNewPlayerMode ? null : (
                      <OverlayTrigger
                        overlay={minsApplyTooltip}
                        placement="auto"
                      >
                        <Button
                          size="sm"
                          variant="outline-secondary"
                          disabled={overrides?.pause}
                          onClick={() => {
                            const newMins = parseInt(currMins);
                            if (newMins < 1) {
                              setShowingMinsError(true);
                            } else {
                              if (
                                !(
                                  parseInt(currMins || "-1") ==
                                    overrides?.mins ||
                                  (!currMins && _.isNil(overrides?.mins))
                                )
                              ) {
                                const currOverrides = overrides
                                  ? _.clone(overrides)
                                  : {};
                                if (currMins == "") {
                                  delete currOverrides.mins;
                                } else {
                                  currOverrides.mins = newMins;
                                }
                                onUpdate(
                                  _.isEmpty(currOverrides)
                                    ? undefined
                                    : currOverrides
                                );
                              }
                            }
                          }}
                        >
                          +
                        </Button>
                      </OverlayTrigger>
                    )}
                  </Col>
                  {enableNil ? (
                    <Col xs={3}>
                      <InputGroup>
                        <InputGroup.Prepend>
                          <InputGroup.Text id="minPct">NIL $</InputGroup.Text>
                        </InputGroup.Prepend>
                        <Form.Control
                          disabled={overrides?.pause}
                          onChange={(ev: any) => {
                            if (/^[0-9]*$/.exec(ev.target.value || "")) {
                              setCurrNil(ev.target.value || "");
                            }
                          }}
                          placeholder="eg 100"
                          value={currNil}
                        />
                      </InputGroup>
                    </Col>
                  ) : (
                    <Col xs={3} />
                  )}
                  {enableNil ? (
                    <Col xs={1} className="pt-1">
                      {addNewPlayerMode ? null : (
                        <OverlayTrigger
                          overlay={nilApplyTooltip}
                          placement="auto"
                        >
                          <Button
                            size="sm"
                            variant="outline-secondary"
                            disabled={overrides?.pause}
                            onClick={() => {
                              if (
                                !(
                                  parseInt(currNil || "-1") == overrides?.nil ||
                                  (!currNil && _.isNil(overrides?.nil))
                                )
                              ) {
                                const currOverrides = overrides
                                  ? _.clone(overrides)
                                  : {};
                                if (currNil == "") {
                                  delete currOverrides.nil;
                                } else {
                                  currOverrides.nil = parseInt(currNil);
                                }
                                onUpdate(
                                  _.isEmpty(currOverrides)
                                    ? undefined
                                    : currOverrides
                                );
                              }
                            }}
                          >
                            +
                          </Button>
                        </OverlayTrigger>
                      )}
                    </Col>
                  ) : (
                    <Col xs={1} />
                  )}
                  <Col xs={1} className="pt-1">
                    {addNewPlayerMode ? null : (
                      <OverlayTrigger overlay={resetTooltip} placement="auto">
                        <Button
                          size="sm"
                          variant="outline-secondary"
                          onClick={(ev: any) => {
                            setCurrOffAdj(isFr ? undefined : 0);
                            setCurrDefAdj(isFr ? undefined : 0);

                            if (isHandAddedPlayer) {
                              // Only reset the off/def adjustments to 0
                              const currOverrides = overrides
                                ? _.clone(overrides)
                                : {};
                              delete currOverrides.global_off_adj;
                              delete currOverrides.global_def_adj;
                              onUpdate(currOverrides);
                            } else {
                              // Else just clear the entire overrdes
                              setCurrMins("");
                              setCurrNil("");
                              if (!isFr) setCurrProfile("Auto");
                              onUpdate(undefined);
                            }
                          }}
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </Button>
                      </OverlayTrigger>
                    )}
                  </Col>
                  <Col xs={1} className="pt-1">
                    {isHandAddedPlayerOrFr ? null : (
                      <OverlayTrigger overlay={pauseTooltip} placement="auto">
                        <Button
                          size="sm"
                          variant={
                            overrides?.pause ? "secondary" : "outline-secondary"
                          }
                          onClick={(ev: any) => {
                            if (overrides) {
                              //(else nothing to pause)
                              const currOverrides = overrides
                                ? _.clone(overrides)
                                : {};
                              if (currOverrides.pause) {
                                delete currOverrides.pause;
                              } else {
                                currOverrides.pause = true;
                              }
                              onUpdate(
                                _.isEmpty(currOverrides)
                                  ? undefined
                                  : currOverrides
                              );
                            }
                          }}
                        >
                          <FontAwesomeIcon icon={faPause} />
                        </Button>
                      </OverlayTrigger>
                    )}
                  </Col>
                  <Col xs={1} className="pt-1">
                    {isBench || addNewPlayerMode ? null : (
                      <OverlayTrigger overlay={deleteTooltip} placement="auto">
                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={(ev: any) => onDelete()}
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </Button>
                      </OverlayTrigger>
                    )}
                  </Col>
                </Row>
                {isBench || addOrEditPlayerMode ? (
                  <Row className="mt-2">
                    <Col xs={1} />
                    <Col xs={6}>
                      <InputGroup>
                        <InputGroup.Prepend>
                          <InputGroup.Text id="minPct">
                            Production profile
                          </InputGroup.Text>
                        </InputGroup.Prepend>
                        <ThemedSelect
                          className="flex-fill"
                          isDisabled={overrides?.pause}
                          value={profileToOption(currProfile)}
                          options={(
                            (addNewPlayerMode ? [] : ["Auto"]) as Profiles[]
                          )
                            .concat(supportedProfiles)
                            .map(profileToOption)}
                          onChange={(option: any) => {
                            const selection = (option as any)?.value || "";
                            setCurrProfile(selection as Profiles);
                          }}
                        />
                      </InputGroup>
                    </Col>
                    <Col xs={3} className="pt-1">
                      {addNewPlayerMode ? null : (
                        <OverlayTrigger
                          overlay={profileApplyTooltip}
                          placement="auto"
                        >
                          <Button
                            size="sm"
                            variant="outline-secondary"
                            disabled={overrides?.pause}
                            onClick={() => {
                              const currOverrides = overrides
                                ? _.clone(overrides)
                                : {};
                              if (currProfile == "Auto") {
                                delete currOverrides.profile;
                              } else {
                                currOverrides.profile = currProfile;
                              }
                              onUpdate(
                                _.isEmpty(currOverrides)
                                  ? undefined
                                  : currOverrides
                              );
                            }}
                          >
                            +
                          </Button>
                        </OverlayTrigger>
                      )}
                      {!addNewPlayerMode &&
                      currProfile != (overrides?.profile || "Auto") ? (
                        <i>&nbsp;(unapplied)</i>
                      ) : null}
                    </Col>
                    <Col xs={2} />
                  </Row>
                ) : null}
                {addOrEditPlayerMode ? (
                  <Row className="mt-2">
                    <Col xs={1} />
                    <Col xs={6}>
                      <InputGroup>
                        <InputGroup.Prepend>
                          <InputGroup.Text id="pos">
                            Positional Role
                          </InputGroup.Text>
                        </InputGroup.Prepend>
                        <ThemedSelect
                          className="flex-fill"
                          isDisabled={overrides?.pause}
                          value={stringToOption(currPos)}
                          options={_.keys(PositionUtils.idToPosition).map(
                            stringToOption
                          )}
                          onChange={(option: any) => {
                            const selection = (option as any)?.value || "";
                            setCurrPos(selection);
                          }}
                        />
                      </InputGroup>
                    </Col>
                    <Col xs={3} className="pt-1">
                      {editPlayerMode ? (
                        <OverlayTrigger
                          overlay={posApplyTooltip}
                          placement="auto"
                        >
                          <Button
                            size="sm"
                            variant="outline-secondary"
                            disabled={overrides?.pause}
                            onClick={() => {
                              const currOverrides = overrides
                                ? _.clone(overrides)
                                : {};
                              currOverrides.pos = currPos;
                              onUpdate(
                                _.isEmpty(currOverrides)
                                  ? undefined
                                  : currOverrides
                              );
                            }}
                          >
                            +
                          </Button>
                        </OverlayTrigger>
                      ) : null}
                      {!addNewPlayerMode && currPos != overrides?.pos ? (
                        <i>&nbsp;(unapplied)</i>
                      ) : null}
                    </Col>
                    <Col xs={2} />
                  </Row>
                ) : null}
                <Row className="mt-3">
                  <Col xs={1} />
                  <Col xs={8}>
                    <Form.Label>
                      <b>Offensive projections</b>:{" "}
                      <span>
                        adjustment=[{overrides?.global_off_adj || 0}]
                        {currOffAdj ==
                        (overrides?.global_off_adj || 0) ? null : (
                          <span> new=[{currOffAdj}]</span>
                        )}
                      </span>
                    </Form.Label>
                    <Form inline>
                      <Form.Label className="pull-left">
                        Bearish&nbsp;&nbsp;&nbsp;
                      </Form.Label>
                      <Form className="flex-fill">
                        <Form.Control
                          type="range"
                          custom
                          disabled={overrides?.pause}
                          value={currOffAdj}
                          onChange={(ev: any) => {
                            const newVal = parseFloat(ev.target.value);
                            setCurrOffAdj(newVal);
                          }}
                          min={-3}
                          max={3}
                          step={0.25}
                        />
                      </Form>
                      <Form.Label className="pull-right">
                        &nbsp;&nbsp;&nbsp;Bullish
                      </Form.Label>
                    </Form>
                  </Col>
                  <Col xs={2} className="pt-4">
                    {addNewPlayerMode ? null : (
                      <OverlayTrigger
                        overlay={globalAdjTooltip}
                        placement="auto"
                      >
                        <Button
                          size="sm"
                          variant="outline-secondary"
                          disabled={overrides?.pause}
                          onClick={() => {
                            const currOverrides = overrides
                              ? _.clone(overrides)
                              : {};
                            if (currOffAdj == 0) {
                              delete currOverrides.global_off_adj;
                            } else {
                              currOverrides.global_off_adj = currOffAdj;
                            }
                            if (currDefAdj == 0) {
                              delete currOverrides.global_def_adj;
                            } else {
                              currOverrides.global_def_adj = -(currDefAdj || 0);
                            }
                            onUpdate(
                              _.isEmpty(currOverrides)
                                ? undefined
                                : currOverrides
                            );
                          }}
                        >
                          +
                        </Button>
                      </OverlayTrigger>
                    )}
                  </Col>
                  <Col xs={1} />
                </Row>
                <Row className="mt-3 mb-2">
                  <Col xs={1} />
                  <Col xs={8}>
                    <Form.Label>
                      <b>Defensive projections</b>:{" "}
                      <span>
                        adjustment=[{-(overrides?.global_def_adj || 0)}]
                        {currDefAdj ==
                        -(overrides?.global_def_adj || 0) ? null : (
                          <span> new=[{currDefAdj}]</span>
                        )}
                      </span>
                    </Form.Label>
                    <Form inline>
                      <Form.Label className="pull-left">
                        Bearish&nbsp;&nbsp;&nbsp;
                      </Form.Label>
                      <Form className="flex-fill">
                        <Form.Control
                          type="range"
                          custom
                          disabled={overrides?.pause}
                          value={currDefAdj}
                          onChange={(ev: any) => {
                            const newVal = parseFloat(ev.target.value);
                            setCurrDefAdj(newVal);
                          }}
                          min={-3}
                          max={3}
                          step={0.25}
                        />
                      </Form>
                      <Form.Label className="pull-right">
                        &nbsp;&nbsp;&nbsp;Bullish
                      </Form.Label>
                    </Form>
                  </Col>
                  <Col xs={2} />
                  <Col xs={1} />
                </Row>
              </Container>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};
export default TeamRosterEditor;
