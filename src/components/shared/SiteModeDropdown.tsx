// React imports:
import { constant } from "lodash";
import { useTheme } from "next-themes";
import React, { useState } from "react";
import { Dropdown, InputGroup } from "react-bootstrap";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMoon } from "@fortawesome/free-solid-svg-icons";
import GenericTogglingMenuItem from "./GenericTogglingMenuItem";

/** An alternate way of letting the user pick the theme (only show on large screens) */
const SiteModeDropdown: React.FunctionComponent<any> = () => {
  const { theme, setTheme } = useTheme();
  return (
    <Dropdown
      className="d-none d-xl-block"
      as={InputGroup.Append}
      variant="outline-secondary"
      alignRight
      style={{ maxHeight: "2.4rem", position: "absolute", top: 8, right: 16 }}
    >
      <Dropdown.Toggle
        size="sm"
        variant="outline-secondary"
        id="dropdown-basic"
      >
        <small>
          <FontAwesomeIcon icon={faMoon} />
        </small>
      </Dropdown.Toggle>
      <Dropdown.Menu>
        <GenericTogglingMenuItem
          text="Light"
          truthVal={theme == "light"}
          onSelect={() => {
            setTheme("light");
            window.location.reload();
          }}
        />
        <GenericTogglingMenuItem
          text="Dark"
          truthVal={theme == "dark"}
          onSelect={() => {
            setTheme("dark");
            window.location.reload();
          }}
        />
        <GenericTogglingMenuItem
          text="System"
          truthVal={theme == "system"}
          onSelect={() => {
            setTheme("system");
            window.location.reload();
          }}
        />
      </Dropdown.Menu>
    </Dropdown>
  );
};
export default SiteModeDropdown;
