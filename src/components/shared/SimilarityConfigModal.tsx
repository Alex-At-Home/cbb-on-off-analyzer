// React imports:
import React from "react";

// Bootstrap imports:
import {
  Button,
  Col,
  Form,
  Modal,
  Row,
} from "react-bootstrap";

// Utils:
import { SimilarityConfig } from "../../utils/FilterModels";

interface Props {
  show: boolean;
  onHide: () => void;
  config: SimilarityConfig;
  onConfigChange: (config: SimilarityConfig) => void;
}

const SimilarityConfigModal: React.FunctionComponent<Props> = ({
  show,
  onHide,
  config,
  onConfigChange,
}) => {
  const handleConfigChange = (field: keyof SimilarityConfig, value: any) => {
    onConfigChange({
      ...config,
      [field]: value,
    });
  };

  const weightingOptions = [
    { value: 'none', label: 'None' },
    { value: 'less', label: 'Less' },
    { value: 'default', label: 'Default' },
    { value: 'more', label: 'More' },
  ];

  const scoringModeOptions = [
    { value: 'sos-adjusted', label: 'SoS-adjusted' },
    { value: 'raw', label: 'Raw' },
    { value: 'relative', label: 'Relative' },
  ];

  const defensiveSkillOptions = [
    { value: 'sos-adjusted', label: 'SoS-adjusted' },
    { value: 'raw', label: 'Raw' },
    { value: 'relative', label: 'Relative' },
    { value: 'none', label: 'None' },
  ];

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Advanced Similarity Configuration</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* Play Style Section */}
        <Row className="mb-4">
          <Col xs={12}>
            <h5 className="mb-3">Play Style</h5>
            <Row>
              <Col xs={12} className="mb-3">
                <Form.Check
                  type="switch"
                  id="includeTransition"
                  label="Include transition"
                  checked={config.includeTransition}
                  onChange={(e) => handleConfigChange('includeTransition', e.target.checked)}
                />
              </Col>
              <Col xs={6} md={3}>
                <Form.Group>
                  <Form.Label>
                    <small><b>Assist weighting</b></small>
                  </Form.Label>
                  <Form.Control
                    as="select"
                    value={config.assistWeighting}
                    onChange={(e) => handleConfigChange('assistWeighting', e.target.value)}
                  >
                    {weightingOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Control>
                </Form.Group>
              </Col>
              <Col xs={6} md={3}>
                <Form.Group>
                  <Form.Label>
                    <small><b>TO weighting</b></small>
                  </Form.Label>
                  <Form.Control
                    as="select"
                    value={config.turnoverWeighting}
                    onChange={(e) => handleConfigChange('turnoverWeighting', e.target.value)}
                  >
                    {weightingOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Control>
                </Form.Group>
              </Col>
              <Col xs={6} md={3}>
                <Form.Group>
                  <Form.Label>
                    <small><b>ORB weighting</b></small>
                  </Form.Label>
                  <Form.Control
                    as="select"
                    value={config.offensiveReboundWeighting}
                    onChange={(e) => handleConfigChange('offensiveReboundWeighting', e.target.value)}
                  >
                    {weightingOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Control>
                </Form.Group>
              </Col>
              <Col xs={6} md={3}>
                <Form.Group>
                  <Form.Label>
                    <small><b>FT weighting</b></small>
                  </Form.Label>
                  <Form.Control
                    as="select"
                    value={config.freeThrowWeighting}
                    onChange={(e) => handleConfigChange('freeThrowWeighting', e.target.value)}
                  >
                    {weightingOptions.map(option => (
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
        <Row className="mb-4">
          <Col xs={12}>
            <h5 className="mb-3">Scoring Efficiency</h5>
            {/* Top row: Scoring Mode and FG Bonus */}
            <Row className="mb-3">
              <Col xs={6}>
                <Form.Group>
                  <Form.Label>
                    <small><b>Scoring mode</b></small>
                  </Form.Label>
                  <Form.Control
                    as="select"
                    value={config.scoringMode}
                    onChange={(e) => handleConfigChange('scoringMode', e.target.value)}
                  >
                    {scoringModeOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Control>
                </Form.Group>
              </Col>
              <Col xs={6}>
                <Form.Group>
                  <Form.Label>
                    <small><b>FG bonus</b></small>
                  </Form.Label>
                  <Form.Control
                    as="select"
                    value={config.fgBonus}
                    onChange={(e) => handleConfigChange('fgBonus', e.target.value)}
                  >
                    {weightingOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Control>
                </Form.Group>
              </Col>
            </Row>
            {/* Bottom row: Offensive Gravity Bonus and Usage Bonus */}
            <Row>
              <Col xs={6}>
                <Form.Group>
                  <Form.Label>
                    <small><b>Offensive gravity bonus</b></small>
                  </Form.Label>
                  <Form.Control
                    as="select"
                    value={config.offensiveGravityBonus}
                    onChange={(e) => handleConfigChange('offensiveGravityBonus', e.target.value)}
                  >
                    {weightingOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Control>
                </Form.Group>
              </Col>
              <Col xs={6}>
                <Form.Group>
                  <Form.Label>
                    <small><b>Usage bonus</b></small>
                  </Form.Label>
                  <Form.Control
                    as="select"
                    value={config.usageBonus}
                    onChange={(e) => handleConfigChange('usageBonus', e.target.value)}
                  >
                    {weightingOptions.map(option => (
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
        <Row className="mb-4">
          <Col xs={12}>
            <h5 className="mb-3">Defense</h5>
            <Row>
              <Col xs={6} md={3}>
                <Form.Group>
                  <Form.Label>
                    <small><b>Defensive skill</b></small>
                  </Form.Label>
                  <Form.Control
                    as="select"
                    value={config.defensiveSkill}
                    onChange={(e) => handleConfigChange('defensiveSkill', e.target.value)}
                  >
                    {defensiveSkillOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Control>
                </Form.Group>
              </Col>
              <Col xs={6} md={3}>
                <Form.Group>
                  <Form.Label>
                    <small><b>DRB weighting</b></small>
                  </Form.Label>
                  <Form.Control
                    as="select"
                    value={config.defensiveReboundWeighting}
                    onChange={(e) => handleConfigChange('defensiveReboundWeighting', e.target.value)}
                  >
                    {weightingOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Control>
                </Form.Group>
              </Col>
              <Col xs={6} md={3}>
                <Form.Group>
                  <Form.Label>
                    <small><b>Stocks weighting</b></small>
                  </Form.Label>
                  <Form.Control
                    as="select"
                    value={config.stocksWeighting}
                    onChange={(e) => handleConfigChange('stocksWeighting', e.target.value)}
                  >
                    {weightingOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Control>
                </Form.Group>
              </Col>
              <Col xs={6} md={3}>
                <Form.Group>
                  <Form.Label>
                    <small><b>Fouls weighting</b></small>
                  </Form.Label>
                  <Form.Control
                    as="select"
                    value={config.foulsWeighting}
                    onChange={(e) => handleConfigChange('foulsWeighting', e.target.value)}
                  >
                    {weightingOptions.map(option => (
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
        <Row className="mb-4">
          <Col xs={12}>
            <h5 className="mb-3">Player Info</h5>
            <Row>
              <Col xs={6}>
                <Form.Group>
                  <Form.Label>
                    <small><b>Class weighting</b></small>
                  </Form.Label>
                  <Form.Control
                    as="select"
                    value={config.classWeighting}
                    onChange={(e) => handleConfigChange('classWeighting', e.target.value)}
                  >
                    {weightingOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Control>
                </Form.Group>
              </Col>
              <Col xs={6}>
                <Form.Group>
                  <Form.Label>
                    <small><b>Height weighting</b></small>
                  </Form.Label>
                  <Form.Control
                    as="select"
                    value={config.heightWeighting}
                    onChange={(e) => handleConfigChange('heightWeighting', e.target.value)}
                  >
                    {weightingOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Control>
                </Form.Group>
              </Col>
              <Col xs={6}>
                <Form.Group>
                  <Form.Label>
                    <small><b>Minutes weighting</b></small>
                  </Form.Label>
                  <Form.Control
                    as="select"
                    value={config.minutesWeighting}
                    onChange={(e) => handleConfigChange('minutesWeighting', e.target.value)}
                  >
                    {weightingOptions.map(option => (
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
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SimilarityConfigModal;
