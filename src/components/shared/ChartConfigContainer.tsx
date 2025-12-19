// React imports:
import React, { useState } from "react";

// Lodash:
import _ from "lodash";

// Bootstrap imports:
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import Dropdown from "react-bootstrap/Dropdown";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

// Additional components:
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTags, faList } from "@fortawesome/free-solid-svg-icons";
//@ts-ignore
import { components } from "react-select";

// Component imports
import AsyncFormControl from "./AsyncFormControl";
import LinqExpressionBuilder from "./LinqExpressionBuilder";
import GenericTogglingMenuItem from "./GenericTogglingMenuItem";
import ThemedSelect from "./ThemedSelect";
import { CbbColors } from "../../utils/CbbColors";
import { useTheme } from "next-themes";
import { ClientRequestCache } from "../../utils/ClientRequestCache";

export type ChartConfigProps = {
  // Chart title
  title: string;
  onTitleChange: (newTitle: string) => void;
  titlePlaceholder?: string;

  // Chart presets
  chartPresets?: Array<[string, any]>; // Array of [name, preset] tuples
  onApplyPreset?: (preset: any) => void;
  onClearPreset?: () => void;

  // Visibility control
  showConfigOptions: boolean;

  // Filter configuration
  filterValue: string;
  filterError?: string;
  filterPlaceholder: string;
  filterPresets: Array<[string, string]>;
  onFilterChange: (newValue: string) => void;

  // Highlight configuration
  highlightValue: string;
  highlightError?: string;
  highlightPlaceholder: string;
  highlightPresets: Array<[string, string]>;
  onHighlightChange: (newValue: string) => void;

  // Label strategy
  labelStrategy: string;
  labelStrategyOptions?: string[];
  onLabelStrategyChange: (strategy: string) => void;
  labelStrategyTooltip?: React.JSX.Element;

  // Point marker type
  pointMarkerType: string;
  pointMarkerTypeOptions?: string[];
  onPointMarkerTypeChange: (type: string) => void;
  pointMarkerTypeTooltip?: React.JSX.Element;

  // Axis configuration
  xAxis: string;
  yAxis: string;
  onXAxisChange: (newValue: string) => void;
  onYAxisChange: (newValue: string) => void;
  axisPresets: Array<[string, string]>;
  axisPlaceholder?: string;

  // Dot configuration
  dotColor: string;
  onDotColorChange: (newValue: string) => void;
  dotColorMap: string;
  colorMapOptions?: Record<string, any>;
  onDotColorMapChange: (newColorMap: string) => void;
  contrastForegroundBuilder?: (val: number) => string;
  dotSize: string;
  onDotSizeChange: (newValue: string) => void;

  // Common configuration
  autocompleteOptions: string[];
  extraAxisAutocompleteOptions?: string[];
  showHelp: boolean;
};

// Default values
const defaultTitlePlaceholder =
  "Enter a title for this chart or select a preset";
const defaultLabelStrategyOptions = [
  "None",
  "Top 5",
  "Top 10",
  "Top 25",
  "Top/Bottom 5",
  "Top/Bottom 10",
  "Top/Bottom 25",
];
const defaultLabelStrategyTooltip = (
  <Tooltip id="labelStrategyTooltip">
    Label the top/bottom entries based on a SORT BY clause in either the
    'Filter' or 'Highlight' Linq expressions
  </Tooltip>
);
const defaultPointMarkerTypeOptions = [
  "Colored Dot",
  "Team Logo (small)",
  "Team Logo (large)",
];
const defaultPointMarkerTypeTooltip = (
  <Tooltip id="pointMarkerTypeTooltip">
    Choose how data points are displayed on the chart
  </Tooltip>
);
const defaultAxisPlaceholder = "Linq //LABEL //LIMITS //TICKS";
const defaultExtraAxisAutocompleteOptions = ["//LABEL", "//LIMITS", "//TICKS"];

const ChartConfigContainer: React.FunctionComponent<ChartConfigProps> = ({
  title,
  onTitleChange,
  titlePlaceholder = defaultTitlePlaceholder,
  chartPresets,
  onApplyPreset,
  onClearPreset,
  showConfigOptions,
  filterValue,
  filterError,
  filterPlaceholder,
  filterPresets,
  onFilterChange,
  highlightValue,
  highlightError,
  highlightPlaceholder,
  highlightPresets,
  onHighlightChange,
  labelStrategy,
  labelStrategyOptions = defaultLabelStrategyOptions,
  onLabelStrategyChange,
  labelStrategyTooltip = defaultLabelStrategyTooltip,
  pointMarkerType,
  pointMarkerTypeOptions = defaultPointMarkerTypeOptions,
  onPointMarkerTypeChange,
  pointMarkerTypeTooltip = defaultPointMarkerTypeTooltip,
  xAxis,
  yAxis,
  onXAxisChange,
  onYAxisChange,
  axisPresets,
  axisPlaceholder = defaultAxisPlaceholder,
  dotColor,
  onDotColorChange,
  dotColorMap,
  colorMapOptions,
  onDotColorMapChange,
  contrastForegroundBuilder,
  dotSize,
  onDotSizeChange,
  autocompleteOptions,
  extraAxisAutocompleteOptions = defaultExtraAxisAutocompleteOptions,
  showHelp,
}) => {
  const { resolvedTheme } = useTheme();
  const [favTeam, UNUSED_setFavTeam] = useState<string>(
    ClientRequestCache.getSavedTeam() || "Maryland"
  );

  // Internal sync state
  const [linqExpressionSync, setLinqExpressionSync] = useState<number>(0);

  // Internal callback handlers
  const handleFilterChange = (newVal: string, onSync?: boolean) => {
    if (!onSync) setLinqExpressionSync((n) => n + 1);
    onFilterChange(newVal);
  };

  const handleHighlightChange = (newVal: string, onSync?: boolean) => {
    if (!onSync) setLinqExpressionSync((n) => n + 1);
    onHighlightChange(newVal);
  };

  const handleXAxisChange = (newVal: string, onSync?: boolean) => {
    if (!onSync) setLinqExpressionSync((n) => n + 1);
    onXAxisChange(newVal);
  };

  const handleYAxisChange = (newVal: string, onSync?: boolean) => {
    if (!onSync) setLinqExpressionSync((n) => n + 1);
    onYAxisChange(newVal);
  };

  const handleDotColorChange = (newVal: string, onSync?: boolean) => {
    if (!onSync) setLinqExpressionSync((n) => n + 1);
    onDotColorChange(newVal);
  };

  const handleDotSizeChange = (newVal: string, onSync?: boolean) => {
    if (!onSync) setLinqExpressionSync((n) => n + 1);
    onDotSizeChange(newVal);
  };

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

  const buildLabelStrategy = (name: string) => {
    return (
      <GenericTogglingMenuItem
        text={name}
        truthVal={name == labelStrategy}
        onSelect={() => onLabelStrategyChange(name)}
      />
    );
  };

  const buildPointMarkerType = (name: string) => {
    return (
      <GenericTogglingMenuItem
        text={name}
        truthVal={name == pointMarkerType}
        onSelect={() => onPointMarkerTypeChange(name)}
      />
    );
  };

  // Preset functions
  const isPresetSelected = (preset: any) => {
    return (
      (filterPresets.find((t) => t[0] == preset.datasetFilter)?.[1] ||
        preset.datasetFilter ||
        "") == filterValue &&
      (highlightPresets.find((t) => t[0] == preset.highlightFilter)?.[1] ||
        preset.highlightFilter ||
        "") == highlightValue &&
      (axisPresets.find((t) => t[0] == preset.xAxis)?.[1] ||
        preset.xAxis ||
        "") == xAxis &&
      (axisPresets.find((t) => t[0] == preset.yAxis)?.[1] ||
        preset.yAxis ||
        "") == yAxis &&
      (axisPresets.find((t) => t[0] == preset.dotColor)?.[1] ||
        preset.dotColor ||
        "") == dotColor &&
      (axisPresets.find((t) => t[0] == preset.dotSize)?.[1] ||
        preset.dotSize ||
        "") == dotSize &&
      labelStrategy == preset.labelStrategy &&
      dotColorMap == preset.dotColorMap &&
      pointMarkerType == preset.pointMarkerType
    );
  };

  const buildPresetMenuItem = (name: string, preset: any) => {
    return (
      <GenericTogglingMenuItem
        text={name}
        truthVal={isPresetSelected(preset)}
        onSelect={() => onApplyPreset?.(preset)}
      />
    );
  };

  const getChartPresets = () => {
    if (!chartPresets) return null;

    const tooltipForFilterPresets = (
      <Tooltip id="overallFilterPresets">Preset charts</Tooltip>
    );
    return (
      <Dropdown alignRight>
        <Dropdown.Toggle
          variant={title == "" ? "warning" : "outline-secondary"}
        >
          <OverlayTrigger placement="auto" overlay={tooltipForFilterPresets}>
            <FontAwesomeIcon icon={faList} />
          </OverlayTrigger>
        </Dropdown.Toggle>
        <Dropdown.Menu>
          <GenericTogglingMenuItem
            text={<i>Clear selection</i>}
            truthVal={false}
            onSelect={() => onClearPreset?.()}
          />
          {chartPresets.map((preset) =>
            buildPresetMenuItem(preset[0], preset[1])
          )}
        </Dropdown.Menu>
      </Dropdown>
    );
  };

  return (
    <Container className="medium_screen">
      <Form.Row>
        <Form.Group as={Col} xs="12">
          <InputGroup>
            <InputGroup.Prepend>
              <InputGroup.Text id="filter">Chart Title</InputGroup.Text>
            </InputGroup.Prepend>
            <AsyncFormControl
              startingVal={title}
              onChange={(newStr: string) => {
                if (newStr != title) onTitleChange(newStr);
              }}
              timeout={500}
              placeholder={titlePlaceholder}
              allowExternalChange={true}
            />
            {chartPresets && (
              <InputGroup.Append>{getChartPresets()}</InputGroup.Append>
            )}
          </InputGroup>
        </Form.Group>
      </Form.Row>
      {showConfigOptions ? (
        <Form.Row className="mb-2">
          <Col xs={11} sm={11} md={11} lg={11}>
            <LinqExpressionBuilder
              label="Filter"
              prompt={filterPlaceholder}
              value={filterValue}
              error={filterError}
              autocomplete={autocompleteOptions}
              presets={filterPresets}
              syncEvent={linqExpressionSync}
              callback={handleFilterChange}
              showHelp={showHelp}
            />
          </Col>
          <Col xs={1} sm={1} md={1} lg={1}>
            <Dropdown alignRight style={{ maxHeight: "2.4rem" }}>
              <Dropdown.Toggle variant="outline-secondary">
                <OverlayTrigger
                  placement="auto"
                  overlay={pointMarkerTypeTooltip}
                >
                  <small>
                    &#9679;/
                    <img
                      style={{ width: "16px", height: "16px" }}
                      src={`logos/${
                        resolvedTheme == "dark" ? "dark" : "normal"
                      }/${favTeam}.png`}
                      alt="Point Marker"
                    />
                  </small>
                </OverlayTrigger>
              </Dropdown.Toggle>
              <Dropdown.Menu>
                {pointMarkerTypeOptions.map(buildPointMarkerType)}
              </Dropdown.Menu>
            </Dropdown>
          </Col>
        </Form.Row>
      ) : null}
      {showConfigOptions ? (
        <Form.Row className="mb-2">
          <Col xs={11} sm={11} md={11} lg={11}>
            <LinqExpressionBuilder
              label="Highlight"
              prompt={highlightPlaceholder}
              value={highlightValue}
              error={highlightError}
              autocomplete={autocompleteOptions}
              presets={highlightPresets}
              syncEvent={linqExpressionSync}
              callback={handleHighlightChange}
              showHelp={showHelp}
            />
          </Col>
          <Col xs={1} sm={1} md={1} lg={1}>
            <Dropdown alignRight style={{ maxHeight: "2.4rem" }}>
              <Dropdown.Toggle variant="outline-secondary">
                <OverlayTrigger placement="auto" overlay={labelStrategyTooltip}>
                  <FontAwesomeIcon icon={faTags} />
                </OverlayTrigger>
              </Dropdown.Toggle>
              <Dropdown.Menu>
                {labelStrategyOptions.map(buildLabelStrategy)}
              </Dropdown.Menu>
            </Dropdown>
          </Col>
        </Form.Row>
      ) : null}
      {showConfigOptions ? (
        <Form.Row className="mb-2">
          <Col xs={12} sm={12} md={6} lg={6}>
            <LinqExpressionBuilder
              label="X-Axis"
              prompt={axisPlaceholder}
              value={xAxis}
              error={filterError}
              autocomplete={autocompleteOptions.concat(
                extraAxisAutocompleteOptions
              )}
              presets={axisPresets}
              presetsIcon={faList}
              syncEvent={linqExpressionSync}
              callback={handleXAxisChange}
              showHelp={showHelp}
              searchBar={true}
            />
          </Col>
          <Col xs={12} sm={12} md={6} lg={6}>
            <LinqExpressionBuilder
              label="Y-Axis"
              prompt={axisPlaceholder}
              value={yAxis}
              error={filterError}
              autocomplete={autocompleteOptions.concat(
                extraAxisAutocompleteOptions
              )}
              presets={axisPresets}
              presetsIcon={faList}
              syncEvent={linqExpressionSync}
              callback={handleYAxisChange}
              showHelp={showHelp}
              searchBar={true}
            />
          </Col>
        </Form.Row>
      ) : null}
      {showConfigOptions ? (
        <Form.Row className="mb-2">
          <Col xs={6} sm={6} md={5} lg={5}>
            <LinqExpressionBuilder
              label="Color"
              prompt="Linq expression for color vs colormap selected to right"
              value={dotColor}
              error={filterError}
              autocomplete={autocompleteOptions}
              presets={axisPresets}
              presetsIcon={faList}
              syncEvent={linqExpressionSync}
              callback={handleDotColorChange}
              showHelp={showHelp}
              searchBar={true}
            />
          </Col>
          <Col xs={6} sm={6} md={2} lg={2}>
            <ThemedSelect
              value={stringToOption(dotColorMap)}
              options={_.keys(colorMapOptions || {}).map((colorMap) =>
                stringToOption(colorMap)
              )}
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
                const newColorMap = (option as any)?.value || "Default";
                onDotColorMapChange(newColorMap);
              }}
            />
          </Col>
          <Col xs={12} sm={12} md={5} lg={5}>
            <LinqExpressionBuilder
              label="Size"
              prompt="Optional Linq expression for datapoint size"
              value={dotSize}
              error={filterError}
              autocomplete={autocompleteOptions}
              presets={axisPresets}
              presetsIcon={faList}
              syncEvent={linqExpressionSync}
              callback={handleDotSizeChange}
              showHelp={showHelp}
              searchBar={true}
            />
          </Col>
        </Form.Row>
      ) : null}
    </Container>
  );
};

export default ChartConfigContainer;
