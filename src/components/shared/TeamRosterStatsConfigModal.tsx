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

// Utils:
import { LuckParams } from "../../utils/FilterModels";

// External Data Model

export type TeamRosterStatsConfig = {
  rapmPriorMode: number;
  rapmRegressMode: number;
  regressDiffs: number;
  showRapmDiag: boolean;
};

type Props = {
  show: boolean;
  onHide: () => void;
  onSave: (config: TeamRosterStatsConfig) => void;
  config: TeamRosterStatsConfig;
  onlyRapm?: boolean;
  noRapmDiagMode?: boolean;
  showHelp: boolean;
};
const TeamRosterStatsConfigModal: React.FunctionComponent<Props> = ({
  onSave,
  config,
  onlyRapm,
  noRapmDiagMode,
  showHelp,
  ...props
}) => {
  useEffect(() => {
    // Update config when the settings change:
    setSavedConfig(config);
  }, [config]);

  const getBase = () => {
    return {
      ...config,
    };
  };
  // State decomposition:
  const [savedConfig, setSavedConfig] = useState(config);
  return (
    <Modal
      {...props}
      onEntered={() => {
        document.body.style.overflow = "scroll";
      }}
    >
      <Modal.Header closeButton>
        <Modal.Title>Advanced Stats Config</Modal.Title>&nbsp;
        {showHelp ? (
          <a
            target="_blank"
            href="https://hoop-explorer.blogspot.com/2020/03/understanding-team-report-onoff-page.html"
          >
            (?)
          </a>
        ) : null}
      </Modal.Header>
      <Modal.Body>
        <Card className="w-100">
          <Card.Header className="small">RAPM</Card.Header>
          <Card.Body>
            <Form inline>
              <Form.Label>RAPM Prior Mode&nbsp;&nbsp;</Form.Label>
              <Form.Control
                as="select"
                onChange={(newVal: any) => {
                  const mutableNewConfig = getBase();
                  if (newVal.target?.value == "Raw RAPM (no prior)") {
                    mutableNewConfig.rapmPriorMode = -2;
                  } else if (newVal.target?.value == "Recursive Prior") {
                    mutableNewConfig.rapmPriorMode = -3;
                  } else if (newVal.target?.value == "Weak Adj Rtg+ Prior") {
                    mutableNewConfig.rapmPriorMode = 0;
                  } else if (newVal.target?.value == "Medium Adj Rtg+ Prior") {
                    mutableNewConfig.rapmPriorMode = 0.5;
                  } else if (
                    newVal.target?.value == "Adaptive Adj Rtg+ Prior"
                  ) {
                    mutableNewConfig.rapmPriorMode = -1;
                  } else if (newVal.target?.value == "Strong Adj Rtg+ Prior") {
                    mutableNewConfig.rapmPriorMode = 1;
                  }
                  onSave(mutableNewConfig);
                }}
              >
                <option selected={config.rapmPriorMode == -2}>
                  Raw RAPM (no prior)
                </option>
                <option selected={config.rapmPriorMode == -3}>
                  Recursive Prior
                </option>
                <option selected={config.rapmPriorMode == 0}>
                  Weak Adj Rtg+ Prior
                </option>
                <option selected={config.rapmPriorMode == 0.5}>
                  Medium Adj Rtg+ Prior
                </option>
                <option selected={config.rapmPriorMode == -1}>
                  Adaptive Adj Rtg+ Prior
                </option>
                <option selected={config.rapmPriorMode == 1}>
                  Strong Adj Rtg+ Prior
                </option>
              </Form.Control>
            </Form>
            <hr />
            <Form inline>
              <Form.Label>RAPM Regress Mode&nbsp;&nbsp;</Form.Label>
              <Form.Control
                as="select"
                onChange={(newVal: any) => {
                  const mutableNewConfig = getBase();
                  if (newVal.target?.value == "Adapative Regression") {
                    mutableNewConfig.rapmRegressMode = -1;
                  } else if (newVal.target?.value == "No Regression") {
                    mutableNewConfig.rapmRegressMode = 0;
                  } else if (newVal.target?.value == "Weak Regression") {
                    mutableNewConfig.rapmRegressMode = 0.2;
                  } else if (newVal.target?.value == "Weakish Regression") {
                    mutableNewConfig.rapmRegressMode = 0.4;
                  } else if (newVal.target?.value == "Strongish Regression") {
                    mutableNewConfig.rapmRegressMode = 0.6;
                  } else if (newVal.target?.value == "Strong Regression") {
                    mutableNewConfig.rapmRegressMode = 0.8;
                  } else if (newVal.target?.value == "Maximum Regression") {
                    mutableNewConfig.rapmRegressMode = 0.8;
                  }
                  onSave(mutableNewConfig);
                }}
              >
                <option selected={config.rapmRegressMode == -1}>
                  Adapative Regression
                </option>
                <option selected={config.rapmRegressMode == 0}>
                  No Regression
                </option>
                <option selected={config.rapmRegressMode == 0.2}>
                  Weak Regression
                </option>
                <option selected={config.rapmRegressMode == 0.4}>
                  Weakish Regression
                </option>
                <option selected={config.rapmRegressMode == 0.6}>
                  Strongish Regression
                </option>
                <option selected={config.rapmRegressMode == 0.8}>
                  Strong Regression
                </option>
                <option selected={config.rapmRegressMode == 1.0}>
                  Maximum Regression
                </option>
              </Form.Control>
            </Form>
            <hr />
            {noRapmDiagMode ? null : (
              <Form inline>
                <Form.Check
                  checked={config.showRapmDiag}
                  type="checkbox"
                  label="Show RAPM diag mode"
                  onChange={(evt: any) => {
                    const newConfig = {
                      ...getBase(),
                      showRapmDiag: evt.target.checked || false,
                    };
                    onSave(newConfig);
                  }}
                />
              </Form>
            )}
          </Card.Body>
        </Card>

        {onlyRapm ? null : (
          <Card className="w-100">
            <Card.Header className="small">
              Replacement On-Off ("Same-4")
            </Card.Header>
            <Card.Body>
              <Row>
                <Col xs={4}>
                  <Form>
                    <Form.Check type="radio">
                      <Form.Check.Input
                        id="same4RegressTo"
                        type="radio"
                        checked={config.regressDiffs <= 0}
                        onChange={() => {
                          const newConfig = {
                            ...getBase(),
                            regressDiffs: -1 * Math.abs(config.regressDiffs),
                          };
                          onSave(newConfig);
                        }}
                      />
                      <Form.Check.Label htmlFor="same4RegressTo">
                        Regress to
                      </Form.Check.Label>
                    </Form.Check>
                    <Form.Check type="radio">
                      <Form.Check.Input
                        id="same4RegressBy"
                        type="radio"
                        checked={config.regressDiffs > 0}
                        onChange={() => {
                          const newConfig = {
                            ...getBase(),
                            regressDiffs: Math.abs(config.regressDiffs),
                          };
                          onSave(newConfig);
                        }}
                      />
                      <Form.Check.Label htmlFor="generalLuckBaseBaseline">
                        Regress by
                      </Form.Check.Label>
                    </Form.Check>
                  </Form>
                </Col>

                <Col>
                  <Form inline>
                    <Form.Control
                      as="select"
                      onChange={(newVal: any) => {
                        const sgn = config.regressDiffs > 0 ? 1 : -1;
                        const newConfig = {
                          ...getBase(),
                          regressDiffs: sgn * (newVal.target?.value || 0),
                        };
                        onSave(newConfig);
                      }}
                    >
                      <option selected={Math.abs(config.regressDiffs) == 3000}>
                        3000
                      </option>
                      <option selected={Math.abs(config.regressDiffs) == 2000}>
                        2000
                      </option>
                      <option selected={Math.abs(config.regressDiffs) == 1000}>
                        1000
                      </option>
                      <option selected={Math.abs(config.regressDiffs) == 500}>
                        500
                      </option>
                      <option selected={Math.abs(config.regressDiffs) == 0}>
                        0
                      </option>
                    </Form.Control>
                    <Form.Label> &nbsp;&nbsp;samples</Form.Label>
                  </Form>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={() => props.onHide()}>
          Exit
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
export default TeamRosterStatsConfigModal;
