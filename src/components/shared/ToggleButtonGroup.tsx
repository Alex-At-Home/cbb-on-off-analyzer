// React imports:
import React, { useState } from "react";

// Bootstrap imports:

import Button from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import ToggleButton from "react-bootstrap/ToggleButton";
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
export type ToggleButtonGroup = {
  items: ToggleButtonItem[];
};
const isGroupItem = (
  item: ToggleButtonItem | ToggleButtonGroup,
): item is ToggleButtonGroup => !_.isNil((item as ToggleButtonGroup).items);

type Props = {
  labelOverride?: string;
  items: (ToggleButtonItem | ToggleButtonGroup)[];
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

  const maybeOverlayTrigger = (
    child: React.ReactElement,
    tooltip: string | React.ReactNode | undefined,
    index: number,
  ) =>
    tooltip && tooltip != "" ? (
      <OverlayTrigger placement="auto" overlay={tooltipGen(tooltip, index)}>
        {child}
      </OverlayTrigger>
    ) : (
      child
    );

  return override || typeof window !== `undefined` ? (
    <div>
      <small>{labelOverride ?? "Quick Select:"}</small>&nbsp;&nbsp;
      {items.map((item, index) => {
        if (isGroupItem(item)) {
          const tooltip = (
            <div>
              {item.items.map((it) => (
                <>
                  <span key={`btnGrp_${index}`}>{it.tooltip}</span>
                  <br />
                  <br />
                </>
              ))}
            </div>
          );
          return maybeOverlayTrigger(
            <ButtonGroup className="pr-2" toggle>
              {item.items.map((it, itIdx) => (
                <ToggleButton
                  type="radio"
                  key={`tog_${index}_${itIdx}`}
                  disabled={it.disabled}
                  value={itIdx}
                  onClick={it.onClick}
                  size="sm"
                  style={{
                    ...(it.toggled
                      ? {
                          borderColor: "#aea79f",
                        }
                      : {}),
                  }}
                  variant={it.toggled ? "dark" : "outline-secondary"}
                >
                  {it.label}
                </ToggleButton>
              ))}
            </ButtonGroup>,
            tooltip,
            index,
          );
        } else {
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
                    key={`tog_${index}`}
                    variant={item.toggled ? "dark" : "outline-secondary"}
                  >
                    {item.label}
                  </Button>
                ),
                item.tooltip,
                index,
              )}
              &nbsp;&nbsp;
            </span>
          );
        }
      })}
    </div>
  ) : (
    <div />
  ); //(this construct needed to address SSR caching issue)
};
export default ToggleButtonGroup;
