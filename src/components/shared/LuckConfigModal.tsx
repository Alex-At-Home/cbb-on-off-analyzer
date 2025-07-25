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

type Props = {
  show: boolean;
  onHide: () => void;
  onSave: (luck: LuckParams) => void;
  luck: LuckParams;
  showHelp: boolean;
};
const LuckConfigModal: React.FunctionComponent<Props> = ({
  onSave,
  luck,
  showHelp,
  ...props
}) => {
  useEffect(() => {
    // Update luck when the settings change:
    setGeneralLuckBase(luck.base as "baseline" | "season");
  }, [luck]);

  // State decomposition:
  const [generalLuckBase, setGeneralLuckBase] = useState(
    luck.base as "baseline" | "season"
  );
  return (
    <Modal
      {...props}
      onEntered={() => {
        document.body.style.overflow = "scroll";
      }}
    >
      <Modal.Header closeButton>
        <Modal.Title>Luck Adjustment Config</Modal.Title>&nbsp;
        {showHelp ? (
          <a
            target="_blank"
            href="https://hoop-explorer.blogspot.com/2020/07/luck-adjustment-details.html"
          >
            (?)
          </a>
        ) : null}
      </Modal.Header>
      <Modal.Body>
        <Card className="w-100">
          <Card.Header className="small">General</Card.Header>
          <Card.Body>
            <Form.Check type="radio">
              <Form.Check.Input
                id="generalLuckBaseSeason"
                type="radio"
                checked={generalLuckBase == "season"}
                onChange={() => {
                  setGeneralLuckBase("season");
                  onSave({ base: "season" });
                }}
              />
              <Form.Check.Label htmlFor="generalLuckBaseSeason">
                Regress over season (recommended)
              </Form.Check.Label>
            </Form.Check>
            <Form.Check type="radio">
              <Form.Check.Input
                id="generalLuckBaseBaseline"
                type="radio"
                checked={generalLuckBase == "baseline"}
                onChange={() => {
                  setGeneralLuckBase("baseline");
                  onSave({ base: "baseline" });
                }}
              />
              <Form.Check.Label htmlFor="generalLuckBaseBaseline">
                Regress over baseline query
              </Form.Check.Label>
            </Form.Check>
          </Card.Body>
        </Card>

        <Card className="w-100">
          <Card.Header className="small">3P Luck</Card.Header>
          <Card.Body>
            <Form inline>
              <Form.Label>3P% Defense is &nbsp;&nbsp;</Form.Label>
              <Form.Control as="select" disabled>
                <option>66%</option>
              </Form.Control>
              <Form.Label> &nbsp;&nbsp;Luck</Form.Label>
            </Form>
          </Card.Body>
        </Card>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={() => props.onHide()}>
          Exit
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
export default LuckConfigModal;
