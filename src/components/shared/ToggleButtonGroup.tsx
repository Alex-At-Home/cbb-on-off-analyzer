// React imports:
import React, { useState } from "react";

// Bootstrap imports:

import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

export type ToggleButtonItem = {
  label: string | React.ReactNode;
  tooltip?: string | React.ReactNode;
  toggled: boolean;
  onClick: () => void;
  isLabelOnly?: boolean;
  disabled?: boolean;
};

type Props = {
  labelOverride?: string;
  items: ToggleButtonItem[];
  override?: boolean; //(for testing, set to true to force it to render)
};

const ToggleButtonGroup: React.FunctionComponent<Props> = ({
  labelOverride,
  items,
  override,
}) => {
  const tooltipGen = (tooltip: string | React.ReactNode, i: number) => (
    <Tooltip id={`tooltip-${i}`}>{tooltip}</Tooltip>
  );

  const maybeOverlayTrigger = (child: React.ReactElement, item: ToggleButtonItem, index: number) => (
    item.tooltip && item.tooltip != "" ? (
      <OverlayTrigger
        placement="auto"
        overlay={tooltipGen(item.tooltip, index)}
      >
        {child}
      </OverlayTrigger>
    ): child
  );

  return override || typeof window !== `undefined` ? (
    <div>
      <small>{labelOverride || "Quick Select:"}</small>&nbsp;&nbsp;
      {items.map((item, index) => {
        return (
          <span key={"divtog" + index}>
            {maybeOverlayTrigger(
              item.isLabelOnly ? (
                <small>{item.label}</small>
              ) : (
                <Button
                  disabled={item.disabled}
                  onClick={item.onClick}
                  size="sm"
                  key={"tog" + index}
                  variant={item.toggled ? "dark" : "outline-secondary"}
                >
                  {item.label}
                </Button>
              ),
              item, index)}
            &nbsp;&nbsp;
          </span>
        );
      })}
    </div>
  ) : (
    <div />
  ); //(this construct needed to address SSR caching issue)
};
export default ToggleButtonGroup;
