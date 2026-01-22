// React imports:
import React, { useState, useEffect } from "react";

// Bootstrap imports:
import {
  Button,
  Col,
  Form,
  Modal,
  OverlayTrigger,
  Row,
  Tooltip,
} from "react-bootstrap";

// Utils:
import {
  SimilarityConfig,
  DefaultSimilarityConfig,
  ClassWeightingOption,
  LevelOfPlayOption,
} from "../../utils/FilterModels";

interface Props {
  show: boolean;
  onHide: () => void;
  config: SimilarityConfig;
  onConfigChange: (config: SimilarityConfig) => void;
  onApply?: () => void;
}

const SimilarityConfigModal: React.FunctionComponent<Props> = ({
  show,
  onHide,
  config,
  onConfigChange,
  onApply,
}) => {
  const handleConfigChange = (field: keyof SimilarityConfig, value: any) => {
    onConfigChange({
      ...config,
      [field]: value,
    });
  };

  const handleReset = () => {
    onConfigChange(DefaultSimilarityConfig);
    setInternalQuery(DefaultSimilarityConfig.advancedQuery); // Reset internal query too
    setInternalCustomWeights(DefaultSimilarityConfig.customWeights); // Reset internal custom weights too
  };

  // Local state for advanced query to avoid updating config on every keystroke
  const [internalQuery, setInternalQuery] = useState(config.advancedQuery);

  // Local state for custom weights to avoid updating config on every keystroke
  const [internalCustomWeights, setInternalCustomWeights] = useState(
    config.customWeights
  );

  // State for collapsible Advanced Query Options (default collapsed)
  const [advancedOptionsExpanded, setAdvancedOptionsExpanded] = useState(false);

  // Initialize internal values when modal opens
  useEffect(() => {
    if (show) {
      setInternalQuery(config.advancedQuery);
      setInternalCustomWeights(config.customWeights);
    }
  }, [show, config.advancedQuery, config.customWeights]);

  // Update config when modal closes
  const handleClose = () => {
    // Only update if values actually changed
    if (internalQuery !== config.advancedQuery) {
      handleConfigChange("advancedQuery", internalQuery);
    }
    if (internalCustomWeights !== config.customWeights) {
      handleConfigChange("customWeights", internalCustomWeights);
    }
    onHide();
  };

  // Update config when modal closes
  const handleApply = () => {
    // Only update if values actually changed
    if (internalQuery !== config.advancedQuery) {
      handleConfigChange("advancedQuery", internalQuery);
    }
    if (internalCustomWeights !== config.customWeights) {
      handleConfigChange("customWeights", internalCustomWeights);
    }
    if (onApply) onApply();
  };

  const weightingOptions = [
    { value: "none", label: "None" },
    { value: "less", label: "Less" },
    { value: "default", label: "Default" },
    { value: "more", label: "More" },
    { value: "max", label: "Max" },
  ];

  const scoringModeOptions = [
    { value: "sos-adjusted", label: "SoS-adjusted" },
    { value: "raw", label: "Raw" },
    { value: "relative", label: "Relative" },
  ];

  const defensiveSkillOptions = [
    { value: "sos-adjusted", label: "SoS-adjusted" },
    { value: "raw", label: "Raw" },
    { value: "relative", label: "Relative" },
    { value: "none", label: "None" },
  ];

  const classWeightingOptions = [
    { value: "same_class", label: "Same Class" },
    { value: "fr_only", label: "Fr Only" },
    { value: "under", label: "Under" },
    { value: "upper", label: "Upper" },
    { value: "none", label: "None" },
    { value: "less", label: "Less" },
    { value: "default", label: "Default" },
    { value: "more", label: "More" },
    { value: "max", label: "Max" },
  ];

  const levelOfPlayOptions = [
    { value: "any", label: "Any" },
    { value: "same_tier", label: "Same Tier" },
    { value: "same_conf", label: "Same Conf" },
    { value: "similar_sos", label: "Similar SoS" },
  ];

  const closeTooltip = (
    <Tooltip id="close-tooltip">(note: preserves any changes made)</Tooltip>
  );

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Advanced Similarity Configuration</Modal.Title>
      </Modal.Header>
      <Modal.Body className="py-3">
        {/* Play Style Section */}
        <Row className="mb-2">
          <Col xs={12}>
            <h5 className="mb-2">Play Style</h5>
            <Row>
              <Col xs={12} className="mb-2">
                <Form.Check
                  type="switch"
                  id="includeTransition"
                  label="Include transition"
                  checked={config.includeTransition}
                  onChange={(e) =>
                    handleConfigChange("includeTransition", e.target.checked)
                  }
                />
              </Col>
              <Col xs={6} md={3}>
                <Form.Group className="mb-0">
                  <Form.Label>
                    <small>
                      <b>Assist weighting</b>
                    </small>
                  </Form.Label>
                  <Form.Control
                    as="select"
                    value={config.assistWeighting}
                    onChange={(e) =>
                      handleConfigChange("assistWeighting", e.target.value)
                    }
                  >
                    {weightingOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Control>
                </Form.Group>
              </Col>
              <Col xs={6} md={3}>
                <Form.Group className="mb-0">
                  <Form.Label>
                    <small>
                      <b>TO weighting</b>
                    </small>
                  </Form.Label>
                  <Form.Control
                    as="select"
                    value={config.turnoverWeighting}
                    onChange={(e) =>
                      handleConfigChange("turnoverWeighting", e.target.value)
                    }
                  >
                    {weightingOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Control>
                </Form.Group>
              </Col>
              <Col xs={6} md={3}>
                <Form.Group className="mb-0">
                  <Form.Label>
                    <small>
                      <b>ORB weighting</b>
                    </small>
                  </Form.Label>
                  <Form.Control
                    as="select"
                    value={config.offensiveReboundWeighting}
                    onChange={(e) =>
                      handleConfigChange(
                        "offensiveReboundWeighting",
                        e.target.value
                      )
                    }
                  >
                    {weightingOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Control>
                </Form.Group>
              </Col>
              <Col xs={6} md={3}>
                <Form.Group className="mb-0">
                  <Form.Label>
                    <small>
                      <b>FTR weighting</b>
                    </small>
                  </Form.Label>
                  <Form.Control
                    as="select"
                    value={config.freeThrowWeighting}
                    onChange={(e) =>
                      handleConfigChange("freeThrowWeighting", e.target.value)
                    }
                  >
                    {weightingOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Control>
                </Form.Group>
              </Col>
            </Row>
          </Col>
        </Row>

        {/* Scoring Efficiency Section */}
        <Row className="mb-2">
          <Col xs={12}>
            <h5 className="mb-2">Scoring Efficiency</h5>
            <Row>
              <Col xs={6} md={3}>
                <Form.Group className="mb-0">
                  <Form.Label>
                    <small>
                      <b>Scoring mode</b>
                    </small>
                  </Form.Label>
                  <Form.Control
                    as="select"
                    value={config.scoringMode}
                    onChange={(e) =>
                      handleConfigChange("scoringMode", e.target.value)
                    }
                  >
                    {scoringModeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Control>
                </Form.Group>
              </Col>
              <Col xs={6} md={3}>
                <Form.Group className="mb-0">
                  <Form.Label>
                    <small>
                      <b>FG bonus</b>
                    </small>
                  </Form.Label>
                  <Form.Control
                    as="select"
                    value={config.fgBonus}
                    onChange={(e) =>
                      handleConfigChange("fgBonus", e.target.value)
                    }
                  >
                    {weightingOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Control>
                </Form.Group>
              </Col>
              <Col xs={6} md={3}>
                <Form.Group className="mb-0">
                  <Form.Label>
                    <small>
                      <b>Gravity bonus</b>
                    </small>
                  </Form.Label>
                  <Form.Control
                    as="select"
                    value={config.offensiveGravityBonus}
                    onChange={(e) =>
                      handleConfigChange(
                        "offensiveGravityBonus",
                        e.target.value
                      )
                    }
                  >
                    {weightingOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Control>
                </Form.Group>
              </Col>
              <Col xs={6} md={3}>
                <Form.Group className="mb-0">
                  <Form.Label>
                    <small>
                      <b>Usage bonus</b>
                    </small>
                  </Form.Label>
                  <Form.Control
                    as="select"
                    value={config.usageBonus}
                    onChange={(e) =>
                      handleConfigChange("usageBonus", e.target.value)
                    }
                  >
                    {weightingOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Control>
                </Form.Group>
              </Col>
            </Row>
          </Col>
        </Row>

        {/* Defense Section */}
        <Row className="mb-2">
          <Col xs={12}>
            <h5 className="mb-2">Defense</h5>
            <Row>
              <Col xs={6} md={3}>
                <Form.Group className="mb-0">
                  <Form.Label>
                    <small>
                      <b>Defensive skill</b>
                    </small>
                  </Form.Label>
                  <Form.Control
                    as="select"
                    value={config.defensiveSkill}
                    onChange={(e) =>
                      handleConfigChange("defensiveSkill", e.target.value)
                    }
                  >
                    {defensiveSkillOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Control>
                </Form.Group>
              </Col>
              <Col xs={6} md={3}>
                <Form.Group className="mb-0">
                  <Form.Label>
                    <small>
                      <b>DRB weighting</b>
                    </small>
                  </Form.Label>
                  <Form.Control
                    as="select"
                    value={config.defensiveReboundWeighting}
                    onChange={(e) =>
                      handleConfigChange(
                        "defensiveReboundWeighting",
                        e.target.value
                      )
                    }
                  >
                    {weightingOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Control>
                </Form.Group>
              </Col>
              <Col xs={6} md={3}>
                <Form.Group className="mb-0">
                  <Form.Label>
                    <small>
                      <b>Stocks weighting</b>
                    </small>
                  </Form.Label>
                  <Form.Control
                    as="select"
                    value={config.stocksWeighting}
                    onChange={(e) =>
                      handleConfigChange("stocksWeighting", e.target.value)
                    }
                  >
                    {weightingOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Control>
                </Form.Group>
              </Col>
              <Col xs={6} md={3}>
                <Form.Group className="mb-0">
                  <Form.Label>
                    <small>
                      <b>Fouls weighting</b>
                    </small>
                  </Form.Label>
                  <Form.Control
                    as="select"
                    value={config.foulsWeighting}
                    onChange={(e) =>
                      handleConfigChange("foulsWeighting", e.target.value)
                    }
                  >
                    {weightingOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Control>
                </Form.Group>
              </Col>
            </Row>
          </Col>
        </Row>

        {/* Player Info Section */}
        <Row className="mb-2">
          <Col xs={12}>
            <h5 className="mb-2">Player Info</h5>
            <Row>
              <Col xs={6} md={3}>
                <Form.Group className="mb-0">
                  <Form.Label>
                    <small>
                      <b>Class weighting</b>
                    </small>
                  </Form.Label>
                  <Form.Control
                    as="select"
                    value={config.classWeighting}
                    onChange={(e) =>
                      handleConfigChange("classWeighting", e.target.value)
                    }
                  >
                    {classWeightingOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Control>
                </Form.Group>
              </Col>
              <Col xs={6} md={3}>
                <Form.Group className="mb-0">
                  <Form.Label>
                    <small>
                      <b>Height weighting</b>
                    </small>
                  </Form.Label>
                  <Form.Control
                    as="select"
                    value={config.heightWeighting}
                    onChange={(e) =>
                      handleConfigChange("heightWeighting", e.target.value)
                    }
                  >
                    {weightingOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Control>
                </Form.Group>
              </Col>
              <Col xs={6} md={3}>
                <Form.Group className="mb-0">
                  <Form.Label>
                    <small>
                      <b>Minutes weighting</b>
                    </small>
                  </Form.Label>
                  <Form.Control
                    as="select"
                    value={config.minutesWeighting}
                    onChange={(e) =>
                      handleConfigChange("minutesWeighting", e.target.value)
                    }
                  >
                    {weightingOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Control>
                </Form.Group>
              </Col>
              <Col xs={6} md={3}>
                <Form.Group className="mb-0">
                  <Form.Label>
                    <small>
                      <b>Level of play</b>
                    </small>
                  </Form.Label>
                  <Form.Control
                    as="select"
                    value={config.levelOfPlay}
                    onChange={(e) =>
                      handleConfigChange("levelOfPlay", e.target.value)
                    }
                  >
                    {levelOfPlayOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Control>
                </Form.Group>
              </Col>
            </Row>
          </Col>
        </Row>

        {/* Advanced Query Options Section */}
        <Row className="mb-0 pt-3">
          <Col xs={12}>
            <h5
              className="mb-2 d-flex align-items-center"
              style={{ cursor: "pointer" }}
              onClick={() =>
                setAdvancedOptionsExpanded(!advancedOptionsExpanded)
              }
            >
              <span className="mr-2">
                {advancedOptionsExpanded ? "−" : "+"}
              </span>
              Advanced Query Options
            </h5>
            {advancedOptionsExpanded && (
              <>
                <Row>
                  <Col xs={6} md={3}>
                    <Form.Group className="mb-0">
                      <Form.Label>
                        <small>
                          <b>Players count</b>
                        </small>
                      </Form.Label>
                      <Form.Control
                        as="select"
                        value={config.comparisonPlayersCount}
                        onChange={(e) =>
                          handleConfigChange(
                            "comparisonPlayersCount",
                            parseInt(e.target.value)
                          )
                        }
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={40}>40</option>
                      </Form.Control>
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={9}>
                    <Form.Group className="mb-0">
                      <Form.Label>
                        <small>
                          <b>Advanced query</b>
                        </small>
                      </Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Here Be Dragons! Read the docs first."
                        value={internalQuery}
                        onChange={(e) => setInternalQuery(e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Row className="mt-2">
                  <Col xs={6} md={3}>
                    <Form.Group className="mb-0">
                      <Form.Label>
                        <small>
                          <b>Play Type Weights</b>
                        </small>
                      </Form.Label>
                      <Form.Control
                        as="select"
                        value={config.playTypeWeights}
                        onChange={(e) =>
                          handleConfigChange("playTypeWeights", e.target.value)
                        }
                      >
                        {weightingOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Form.Control>
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={9}>
                    <Form.Group className="mb-0">
                      <Form.Label>
                        <small>
                          <b>Custom Weights</b>
                        </small>
                      </Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Attack & Kick: 2.0, Rim Attack: 3.0"
                        value={internalCustomWeights}
                        onChange={(e) =>
                          setInternalCustomWeights(e.target.value)
                        }
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </>
            )}
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer className="py-2">
        <Button variant="danger" onClick={handleReset}>
          Reset to Defaults
        </Button>
        <div className="ml-auto d-flex">
          {onApply && (
            <Button variant="primary" onClick={handleApply} className="mr-2">
              Apply
            </Button>
          )}
          <OverlayTrigger placement="top" overlay={closeTooltip}>
            <Button variant="secondary" onClick={handleClose}>
              Close
            </Button>
          </OverlayTrigger>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default SimilarityConfigModal;
