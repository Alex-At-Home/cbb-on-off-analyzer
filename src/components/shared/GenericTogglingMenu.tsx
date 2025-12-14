// React imports:
import React, { useState } from "react";

// Icons:
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCog } from "@fortawesome/free-solid-svg-icons";

// Bootstrap imports:
import Dropdown from "react-bootstrap/Dropdown";
import Tooltip from "react-bootstrap/Tooltip";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";

type Props = {
  size?: "sm" | "lg";
  label?: React.ReactElement;
  drop?: "up" | "left" | "right" | "down";
  alwaysOpen?: boolean;
  tooltip?: React.JSX.Element;
  style?: any;
};

const GenericTogglingMenu: React.FunctionComponent<Props> = ({
  size,
  label,
  drop,
  children,
  alwaysOpen,
  tooltip,
  ...props
}) => {
  // Some extra logic for the config dropdown:
  const [configDropdownOpen, setConfigDropdownOpen] = useState(
    alwaysOpen || false
  );

  const handleToggle = (open: boolean, ev: any, eventType: any) => {
    if (!open && eventType.source == "select") {
      setConfigDropdownOpen(true); //(keep open on select)
    } else {
      setConfigDropdownOpen(alwaysOpen || open);
    }
  };

  const advancedSettingsTooltip = (
    <Tooltip id="gearTooltip">Advanced options</Tooltip>
  );

  return (
    <Dropdown
      alignRight
      drop={drop || "up"}
      onToggle={handleToggle}
      show={configDropdownOpen}
      {...props}
    >
      {label ? (
        <Dropdown.Toggle
          size={size}
          variant="outline-secondary"
          id="dropdown-basic"
        >
          {label}
        </Dropdown.Toggle>
      ) : (
        <OverlayTrigger
          placement={drop ? "auto" : "bottom"}
          overlay={tooltip || advancedSettingsTooltip}
        >
          <Dropdown.Toggle
            size={size}
            variant="outline-secondary"
            id="dropdown-basic"
          >
            <FontAwesomeIcon icon={faCog} />
          </Dropdown.Toggle>
        </OverlayTrigger>
      )}
      <Dropdown.Menu>{children}</Dropdown.Menu>
    </Dropdown>
  );
};
export default GenericTogglingMenu;
