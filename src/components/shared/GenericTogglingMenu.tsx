// React imports:
import React, { useState, useMemo } from "react";

// Icons:
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCog } from "@fortawesome/free-solid-svg-icons";

// Bootstrap imports:
import Dropdown from "react-bootstrap/Dropdown";
import Tooltip from "react-bootstrap/Tooltip";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Form from "react-bootstrap/Form";

import { DropdownMenuPortal } from "./DropdownMenuPortal";

/** When true, use legacy Dropdown.Menu (no portal). When false, use DropdownMenuPortal for global z-index. */
const LEGACY_DROPDOWN_MENU = true;

type Props = {
  size?: "sm" | "lg";
  label?: React.ReactElement;
  drop?: "up" | "left" | "right" | "down";
  alwaysOpen?: boolean;
  tooltip?: React.JSX.Element;
  style?: any;
  searchBar?: boolean;
  allowlist?: string[];
  closeOnSelect?: boolean;
  /** If true, use legacy in-tree menu; if false, use portaled menu (global z-index). Default: LEGACY_DROPDOWN_MENU.
   * TODO: This didn't work well in all cases, don't have time to investigate, so for now just enabled where needed
   */
  legacyMode?: boolean;
};

const GenericTogglingMenu: React.FunctionComponent<Props> = ({
  size,
  label,
  drop,
  children,
  alwaysOpen,
  closeOnSelect,
  tooltip,
  searchBar,
  allowlist,
  legacyMode = LEGACY_DROPDOWN_MENU,
  ...props
}) => {
  // Some extra logic for the config dropdown:
  const [configDropdownOpen, setConfigDropdownOpen] = useState(
    alwaysOpen || false,
  );

  // Search functionality:
  const [searchText, setSearchText] = useState("");

  // Convert allowlist to Set for faster lookups
  const allowlistSet = useMemo(
    () =>
      allowlist ? new Set(allowlist.map((p) => p.toLowerCase())) : new Set(),
    [allowlist],
  );

  // Helper function to extract text content from React elements
  const extractTextContent = (element: any): string => {
    if (typeof element === "string") return element;
    if (typeof element === "number") return element.toString();
    if (!element) return "";

    if (React.isValidElement(element)) {
      if (
        (element as any).props.text &&
        typeof (element as any).props.text === "string"
      ) {
        return (element as any).props.text;
      } else if ((element as any).props.text) {
        return extractTextContent((element as any).props.text);
      }
      if ((element as any).props.children) {
        return extractTextContent((element as any).props.children);
      }
    }

    if (Array.isArray(element)) {
      return element.map(extractTextContent).join(" ");
    }

    return "";
  };

  // Filter children based on search text and allowlist
  const filteredChildren = useMemo(() => {
    if (!searchBar || !children) return children;

    const childrenArray = React.Children.toArray(children);

    if (!searchText.trim()) return childrenArray;

    return childrenArray.filter((child) => {
      const textContent = extractTextContent(child).toLowerCase();
      const searchLower = searchText.toLowerCase();

      // Always show if in allowlist
      if (allowlistSet.has(textContent)) {
        return true;
      }

      // Filter by search text
      return textContent.includes(searchLower);
    });
  }, [children, searchText, searchBar, allowlistSet]);

  const handleToggle = (open: boolean, ev: any, eventType: any) => {
    if (!open && eventType.source == "select" && !closeOnSelect) {
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
      drop={drop || "down"}
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
      {legacyMode ? (
        <Dropdown.Menu
          style={{ zIndex: 2000, position: "fixed" }}
          popperConfig={{
            strategy: "fixed",
            modifiers: [{ name: "offset", options: { offset: [0, 8] } }],
          }}
        >
          {searchBar && (
            <div className="px-3 py-2">
              <Form.Control
                type="text"
                placeholder="Search..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                size="sm"
              />
            </div>
          )}
          {searchBar && <Dropdown.Divider />}
          {searchBar ? filteredChildren : children}
        </Dropdown.Menu>
      ) : (
        <DropdownMenuPortal
          searchBar={searchBar}
          searchText={searchText}
          onSearchChange={setSearchText}
          filteredChildren={filteredChildren}
        >
          {searchBar ? filteredChildren : children}
        </DropdownMenuPortal>
      )}
    </Dropdown>
  );
};
export default GenericTogglingMenu;
