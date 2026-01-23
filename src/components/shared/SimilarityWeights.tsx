import React, { useState } from "react";
import {
  Row,
  Col,
  Form,
  OverlayTrigger,
  Tooltip,
  Button,
} from "react-bootstrap";
import _ from "lodash";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCog,
  faPlusSquare,
  faMinusSquare,
} from "@fortawesome/free-solid-svg-icons";
import { SimilarityConfig } from "../../utils/FilterModels";
import { PlayerSimilarityUtils } from "../../utils/stats/PlayerSimilarityUtils";

interface Props {
  config: SimilarityConfig;
  onConfigChange: (config: SimilarityConfig) => void;
  onOpenAdvanced: () => void;
  showSliders?: boolean;
  onToggleSliders?: (show: boolean) => void;
}

const SimilarityWeights: React.FunctionComponent<Props> = ({
  config,
  onConfigChange,
  onOpenAdvanced,
  showSliders = true,
  onToggleSliders,
}) => {
  // Handle toggle sliders with fallback to local state if no callback provided
  const handleToggleSliders = () => {
    if (onToggleSliders) {
      onToggleSliders(!showSliders);
    }
  };

  // Temporary state for smooth slider updates
  const [tmpPlayStyleWeight, setTmpPlayStyleWeight] = useState<
    number | undefined
  >(undefined);
  const [tmpScoringEfficiencyWeight, setTmpScoringEfficiencyWeight] = useState<
    number | undefined
  >(undefined);
  const [tmpDefenseWeight, setTmpDefenseWeight] = useState<number | undefined>(
    undefined
  );
  const [tmpPlayerInfoWeight, setTmpPlayerInfoWeight] = useState<
    number | undefined
  >(undefined);

  // Mouse handling for sliders
  const onMouseDown = () => {
    // Start dragging - placeholder for potential future logic
  };

  const onMouseUp = (callback: () => void) => {
    // End dragging and execute callback
    callback();
  };

  const simpleSummary = PlayerSimilarityUtils.simpleSummaryText(config);
  return (
    <div className="similarity-controls mt-2 mb-2">
      <Row className="mb-2">
        <Col
          xs={12}
          className="d-flex align-items-center justify-content-between"
        >
          <h6 className="mb-0">Similarity Weights</h6>{" "}
          <div className="text-muted">
            {simpleSummary ? `(${simpleSummary})` : ""}
          </div>
          <div className="d-flex align-items-center">
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={handleToggleSliders}
              className="p-1 mr-1"
            >
              <FontAwesomeIcon
                icon={showSliders ? faMinusSquare : faPlusSquare}
              />
            </Button>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={onOpenAdvanced}
              className="p-1"
            >
              <FontAwesomeIcon icon={faCog} />
            </Button>
          </div>
        </Col>
      </Row>
      {showSliders && (
        <Row>
          <Col xs={6} md={3}>
            <Form>
              <Form.Group controlId="playStyleRange">
                <Form.Label>
                  <OverlayTrigger
                    placement="auto"
                    overlay={
                      <Tooltip id="play-style-tooltip">
                        How much to weight the scoring breakdown of the player
                        (do they drive? post-up? cut? find cutters and rollers?
                        etc)
                      </Tooltip>
                    }
                  >
                    <small>
                      <b>Play Style</b> [
                      {_.isNil(tmpPlayStyleWeight) ? (
                        <b>
                          {((config?.playStyleWeight ?? 0.5) * 100).toFixed(0)}
                        </b>
                      ) : (
                        <i>{(tmpPlayStyleWeight * 100).toFixed(0)}</i>
                      )}
                      %]
                    </small>
                  </OverlayTrigger>
                </Form.Label>
                <Form.Control
                  type="range"
                  custom
                  value={
                    _.isNil(tmpPlayStyleWeight)
                      ? config?.playStyleWeight ?? 0.5
                      : tmpPlayStyleWeight
                  }
                  onChange={(ev: any) => {
                    const newVal = parseFloat(ev.target.value);
                    if (_.isNil(tmpPlayStyleWeight)) onMouseDown();
                    setTmpPlayStyleWeight(newVal);
                  }}
                  onClick={(ev: any) =>
                    onMouseUp(() => {
                      const newVal = parseFloat(ev.target.value);
                      onConfigChange({ ...config, playStyleWeight: newVal });
                      setTmpPlayStyleWeight(undefined);
                    })
                  }
                  onTouchEnd={(ev: any) =>
                    onMouseUp(() => {
                      if (!_.isNil(tmpPlayStyleWeight)) {
                        const newVal = parseFloat(ev.target.value);
                        onConfigChange({ ...config, playStyleWeight: newVal });
                        setTmpPlayStyleWeight(undefined);
                      }
                    })
                  }
                  onMouseUp={(ev: any) =>
                    onMouseUp(() => {
                      if (!_.isNil(tmpPlayStyleWeight)) {
                        const newVal = parseFloat(ev.target.value);
                        onConfigChange({ ...config, playStyleWeight: newVal });
                        setTmpPlayStyleWeight(undefined);
                      }
                    })
                  }
                  min={0}
                  max={1}
                  step={0.05}
                />
              </Form.Group>
            </Form>
          </Col>
          <Col xs={6} md={3}>
            <Form>
              <Form.Group controlId="scoringEfficiencyRange">
                <Form.Label>
                  <OverlayTrigger
                    placement="auto"
                    overlay={
                      <Tooltip id="scoring-efficiency-tooltip">
                        How good is the player at actually scoring in the
                        various play types covered by "Play Style"?
                      </Tooltip>
                    }
                  >
                    <small>
                      <b>Scoring Efficiency</b> [
                      {_.isNil(tmpScoringEfficiencyWeight) ? (
                        <b>
                          {(
                            (config?.scoringEfficiencyWeight ?? 0.5) * 100
                          ).toFixed(0)}
                        </b>
                      ) : (
                        <i>{(tmpScoringEfficiencyWeight * 100).toFixed(0)}</i>
                      )}
                      %]
                    </small>
                  </OverlayTrigger>
                </Form.Label>
                <Form.Control
                  type="range"
                  custom
                  value={
                    _.isNil(tmpScoringEfficiencyWeight)
                      ? config?.scoringEfficiencyWeight ?? 0.5
                      : tmpScoringEfficiencyWeight
                  }
                  onChange={(ev: any) => {
                    const newVal = parseFloat(ev.target.value);
                    if (_.isNil(tmpScoringEfficiencyWeight)) onMouseDown();
                    setTmpScoringEfficiencyWeight(newVal);
                  }}
                  onClick={(ev: any) =>
                    onMouseUp(() => {
                      const newVal = parseFloat(ev.target.value);
                      onConfigChange({
                        ...config,
                        scoringEfficiencyWeight: newVal,
                      });
                      setTmpScoringEfficiencyWeight(undefined);
                    })
                  }
                  onTouchEnd={(ev: any) =>
                    onMouseUp(() => {
                      if (!_.isNil(tmpScoringEfficiencyWeight)) {
                        const newVal = parseFloat(ev.target.value);
                        onConfigChange({
                          ...config,
                          scoringEfficiencyWeight: newVal,
                        });
                        setTmpScoringEfficiencyWeight(undefined);
                      }
                    })
                  }
                  onMouseUp={(ev: any) =>
                    onMouseUp(() => {
                      if (!_.isNil(tmpScoringEfficiencyWeight)) {
                        const newVal = parseFloat(ev.target.value);
                        onConfigChange({
                          ...config,
                          scoringEfficiencyWeight: newVal,
                        });
                        setTmpScoringEfficiencyWeight(undefined);
                      }
                    })
                  }
                  min={0}
                  max={1}
                  step={0.05}
                />
              </Form.Group>
            </Form>
          </Col>
          <Col xs={6} md={3}>
            <Form>
              <Form.Group controlId="defenseRange">
                <Form.Label>
                  <OverlayTrigger
                    placement="auto"
                    overlay={
                      <Tooltip id="defense-tooltip">
                        How well (within the framework of their team's defense)
                        does the player defend, and in what measurable ways
                        (steals, fouls, blocks, rebounds)
                      </Tooltip>
                    }
                  >
                    <small>
                      <b>Defense</b> [
                      {_.isNil(tmpDefenseWeight) ? (
                        <b>
                          {((config?.defenseWeight ?? 0.5) * 100).toFixed(0)}
                        </b>
                      ) : (
                        <i>{(tmpDefenseWeight * 100).toFixed(0)}</i>
                      )}
                      %]
                    </small>
                  </OverlayTrigger>
                </Form.Label>
                <Form.Control
                  type="range"
                  custom
                  value={
                    _.isNil(tmpDefenseWeight)
                      ? config?.defenseWeight ?? 0.5
                      : tmpDefenseWeight
                  }
                  onChange={(ev: any) => {
                    const newVal = parseFloat(ev.target.value);
                    if (_.isNil(tmpDefenseWeight)) onMouseDown();
                    setTmpDefenseWeight(newVal);
                  }}
                  onClick={(ev: any) =>
                    onMouseUp(() => {
                      const newVal = parseFloat(ev.target.value);
                      onConfigChange({ ...config, defenseWeight: newVal });
                      setTmpDefenseWeight(undefined);
                    })
                  }
                  onTouchEnd={(ev: any) =>
                    onMouseUp(() => {
                      if (!_.isNil(tmpDefenseWeight)) {
                        const newVal = parseFloat(ev.target.value);
                        onConfigChange({ ...config, defenseWeight: newVal });
                        setTmpDefenseWeight(undefined);
                      }
                    })
                  }
                  onMouseUp={(ev: any) =>
                    onMouseUp(() => {
                      if (!_.isNil(tmpDefenseWeight)) {
                        const newVal = parseFloat(ev.target.value);
                        onConfigChange({ ...config, defenseWeight: newVal });
                        setTmpDefenseWeight(undefined);
                      }
                    })
                  }
                  min={0}
                  max={1}
                  step={0.05}
                />
              </Form.Group>
            </Form>
          </Col>
          <Col xs={6} md={3}>
            <Form>
              <Form.Group controlId="playerInfoRange">
                <Form.Label>
                  <OverlayTrigger
                    placement="auto"
                    overlay={
                      <Tooltip id="player-info-tooltip">
                        Add a bonus for players with similar info (class,
                        height, etc)
                      </Tooltip>
                    }
                  >
                    <small>
                      <b>Player Info</b> [
                      {_.isNil(tmpPlayerInfoWeight) ? (
                        <b>
                          {((config?.playerInfoWeight ?? 0.5) * 100).toFixed(0)}
                        </b>
                      ) : (
                        <i>{(tmpPlayerInfoWeight * 100).toFixed(0)}</i>
                      )}
                      %]
                    </small>
                  </OverlayTrigger>
                </Form.Label>
                <Form.Control
                  type="range"
                  custom
                  value={
                    _.isNil(tmpPlayerInfoWeight)
                      ? config?.playerInfoWeight ?? 0.5
                      : tmpPlayerInfoWeight
                  }
                  onChange={(ev: any) => {
                    const newVal = parseFloat(ev.target.value);
                    if (_.isNil(tmpPlayerInfoWeight)) onMouseDown();
                    setTmpPlayerInfoWeight(newVal);
                  }}
                  onClick={(ev: any) =>
                    onMouseUp(() => {
                      const newVal = parseFloat(ev.target.value);
                      onConfigChange({ ...config, playerInfoWeight: newVal });
                      setTmpPlayerInfoWeight(undefined);
                    })
                  }
                  onTouchEnd={(ev: any) =>
                    onMouseUp(() => {
                      if (!_.isNil(tmpPlayerInfoWeight)) {
                        const newVal = parseFloat(ev.target.value);
                        onConfigChange({ ...config, playerInfoWeight: newVal });
                        setTmpPlayerInfoWeight(undefined);
                      }
                    })
                  }
                  onMouseUp={(ev: any) =>
                    onMouseUp(() => {
                      if (!_.isNil(tmpPlayerInfoWeight)) {
                        const newVal = parseFloat(ev.target.value);
                        onConfigChange({ ...config, playerInfoWeight: newVal });
                        setTmpPlayerInfoWeight(undefined);
                      }
                    })
                  }
                  min={0}
                  max={1}
                  step={0.05}
                />
              </Form.Group>
            </Form>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default SimilarityWeights;
