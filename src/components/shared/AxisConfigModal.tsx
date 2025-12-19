// React imports:
import React, { useState, useEffect } from "react";

//lodash
import _ from "lodash";

// Bootstrap imports:
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import FormControl from "react-bootstrap/FormControl";
import InputGroup from "react-bootstrap/InputGroup";

// Component imports:
import ThemedSelect from "./ThemedSelect";
//@ts-ignore
import { components } from "react-select";

// Utils:
import {
  AxisDecomposition,
  decompAxis,
  recompAxis,
} from "../../utils/ExplorerChartUtils";
import { CbbColors } from "../../utils/CbbColors";

// External Data Model

type Props = {
  show: boolean;
  onHide: () => void;
  onSave: (decomp: AxisDecomposition, rawString: string) => void;
  axisString: string;
  colorMapOptions?: Record<string, any>;
  contrastForegroundBuilder?: (val: number) => string;
  showHelp: boolean;
};

const AxisConfigModal: React.FunctionComponent<Props> = ({
  onSave,
  axisString,
  colorMapOptions,
  contrastForegroundBuilder,
  showHelp,
  ...props
}) => {
  // Parse the initial axis string
  const initialDecomp = decompAxis(axisString);

  // State for form fields
  const [label, setLabel] = useState(initialDecomp.label || "");
  const [quadrantHigh, setQuadrantHigh] = useState(
    initialDecomp.quadrantHigh || ""
  );
  const [quadrantLow, setQuadrantLow] = useState(
    initialDecomp.quadrantLow || ""
  );
  const [limitsMin, setLimitsMin] = useState(
    initialDecomp.limits ? String(initialDecomp.limits[0]) : ""
  );
  const [limitsMax, setLimitsMax] = useState(
    initialDecomp.limits ? String(initialDecomp.limits[1]) : ""
  );
  const [ticks, setTicks] = useState(
    initialDecomp.ticks ? initialDecomp.ticks.join(",") : ""
  );
  const [invert, setInvert] = useState(initialDecomp.invert || false);
  const [axisColor, setAxisColor] = useState(initialDecomp.axisColor || "");

  // Helper functions for dropdown
  function stringToOption(s: string) {
    return { label: s, value: s };
  }

  // Color map single value component for select dropdown
  const ColorMapSingleValue = (props: any) => {
    const label = props.data.label || "Default";
    const labelToRender = label.replace(/[A-Za-z]+[/][A-Za-z]+\s+/, ""); //(remove leading colors)
    const colorMapPicker =
      (colorMapOptions || {})[label] || contrastForegroundBuilder;
    const leftColorStr = CbbColors.toRgba(
      colorMapPicker?.(-Number.MAX_SAFE_INTEGER) || "#000000",
      0.75
    );
    const rightColorStr = CbbColors.toRgba(
      colorMapPicker?.(Number.MAX_SAFE_INTEGER) || "#000000",
      0.75
    );
    return (
      <components.SingleValue {...props}>
        <div
          style={{
            textAlign: "center",
            background:
              label == "Default"
                ? undefined
                : `linear-gradient(to right, ${leftColorStr}, 20%, white, 80%, ${rightColorStr})`,
          }}
        >
          {labelToRender}
        </div>
      </components.SingleValue>
    );
  };

  useEffect(() => {
    // Update form when axisString changes
    const decomp = decompAxis(axisString);
    setLabel(decomp.label || "");
    setQuadrantHigh(decomp.quadrantHigh || "");
    setQuadrantLow(decomp.quadrantLow || "");
    setLimitsMin(decomp.limits ? String(decomp.limits[0]) : "");
    setLimitsMax(decomp.limits ? String(decomp.limits[1]) : "");
    setTicks(decomp.ticks ? decomp.ticks.join(",") : "");
    setInvert(decomp.invert || false);
    setAxisColor(decomp.axisColor || "");
  }, [axisString]);

  const handleSave = () => {
    // Build the updated decomposition
    const updatedDecomp: AxisDecomposition = {
      linq: initialDecomp.linq, // Keep the original linq part
      label: label.trim() || undefined,
      limits:
        limitsMin.trim() && limitsMax.trim()
          ? ([
              isNaN(parseFloat(limitsMin)) ? limitsMin : parseFloat(limitsMin),
              isNaN(parseFloat(limitsMax)) ? limitsMax : parseFloat(limitsMax),
            ] as [string | number, string | number])
          : undefined,
      ticks: ticks.trim()
        ? ticks.split(",").map((t) => {
            const trimmed = t.trim();
            const num = parseFloat(trimmed);
            return isNaN(num) ? trimmed : num;
          })
        : undefined,
      invert: invert || undefined,
      quadrantHigh: quadrantHigh.trim() || undefined,
      quadrantLow: quadrantLow.trim() || undefined,
      axisColor: axisColor.trim() || undefined,
    };

    // Generate the raw string
    const rawString = recompAxis(updatedDecomp);

    // Call the callback
    onSave(updatedDecomp, rawString);
    props.onHide();
  };

  const quadrantsSupported = false;

  return (
    <Modal
      {...props}
      onEntered={() => {
        document.body.style.overflow = "scroll";
      }}
      size="lg"
    >
      <Modal.Header closeButton>
        <Modal.Title>Axis Configuration</Modal.Title>&nbsp;
        {showHelp ? (
          <a target="_blank" href="https://hoop-explorer.blogspot.com/2022/03/">
            (?)
          </a>
        ) : null}
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group as={Row} className="mb-3">
            <Form.Label column sm={3}>
              Label:
            </Form.Label>
            <Col sm={9}>
              <FormControl
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Custom axis label"
              />
            </Col>
          </Form.Group>

          {quadrantsSupported ? (
            <Form.Group as={Row} className="mb-3">
              <Form.Label column sm={3}>
                Top Quadrant Text:
              </Form.Label>
              <Col sm={9}>
                <FormControl
                  type="text"
                  value={quadrantHigh}
                  onChange={(e) => setQuadrantHigh(e.target.value)}
                  placeholder="Text displayed at top of axis"
                />
              </Col>
            </Form.Group>
          ) : undefined}

          {quadrantsSupported ? (
            <Form.Group as={Row} className="mb-3">
              <Form.Label column sm={3}>
                Bottom Quadrant Text:
              </Form.Label>
              <Col sm={9}>
                <FormControl
                  type="text"
                  value={quadrantLow}
                  onChange={(e) => setQuadrantLow(e.target.value)}
                  placeholder="Text displayed at bottom of axis"
                />
              </Col>
            </Form.Group>
          ) : undefined}

          <Form.Group as={Row} className="mb-3">
            <Form.Label column sm={3}>
              Limits:
            </Form.Label>
            <Col sm={9}>
              <InputGroup>
                <FormControl
                  type="text"
                  value={limitsMin}
                  onChange={(e) => setLimitsMin(e.target.value)}
                  placeholder="<min>|auto|dataMin[-X]"
                />
                <InputGroup.Text>|</InputGroup.Text>
                <FormControl
                  type="text"
                  value={limitsMax}
                  onChange={(e) => setLimitsMax(e.target.value)}
                  placeholder="<max>|auto|dataMax[+X]"
                />
              </InputGroup>
            </Col>
          </Form.Group>

          <Form.Group as={Row} className="mb-3">
            <Form.Label column sm={3}>
              Ticks:
            </Form.Label>
            <Col sm={9}>
              <FormControl
                type="text"
                value={ticks}
                onChange={(e) => setTicks(e.target.value)}
                placeholder="Comma-separated ticks (avoid with auto/dataMin/dataMax)"
              />
            </Col>
          </Form.Group>

          <Form.Group as={Row} className="mb-3">
            <Form.Label column sm={3}>
              Axis Color:
            </Form.Label>
            <Col sm={4}>
              <ThemedSelect
                value={stringToOption(axisColor || "Default")}
                options={_.keys(
                  /*TODO: add support colorMapOptions ||*/ {
                    Default: undefined,
                  }
                ).map((colorMap) => stringToOption(colorMap))}
                components={
                  //@ts-ignore
                  { SingleValue: ColorMapSingleValue }
                }
                styles={{
                  singleValue: (provided: any, __: any) => ({
                    ...provided,
                    width: "100%",
                  }),
                }}
                isSearchable={false}
                onChange={(option: any) => {
                  const newAxisColor = (option as any)?.value || "Default";
                  setAxisColor(newAxisColor === "Default" ? "" : newAxisColor);
                }}
              />
            </Col>
            <Col sm={1} />
            <Col sm={4} className="pt-1">
              <Form.Check
                type="switch"
                id="invertAxis"
                label="Flip Axis"
                checked={invert}
                onChange={(e) => setInvert(e.target.checked)}
              />
            </Col>
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => props.onHide()}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave}>
          Save
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AxisConfigModal;
