// Renders the dropdown menu in a portal to document.body so it has a global
// stacking context (above cards, footer) whether the menu opens up or down.

import React from "react";
import ReactDOM from "react-dom";
import { useDropdownMenu } from "react-overlays/DropdownMenu";
import Dropdown from "react-bootstrap/Dropdown";
import Form from "react-bootstrap/Form";

const DROPDOWN_MENU_Z = 9999;

export type DropdownMenuPortalProps = {
  searchBar?: boolean;
  searchText: string;
  onSearchChange: (value: string) => void;
  children: React.ReactNode;
  /** When searchBar is true, the list to show (filtered); otherwise unused */
  filteredChildren?: React.ReactNode;
};

export const DropdownMenuPortal: React.FunctionComponent<
  DropdownMenuPortalProps
> = ({ searchBar, searchText, onSearchChange, children, filteredChildren }) => {
  const [menuProps, meta] = useDropdownMenu({
    flip: true,
    usePopper: true,
    popperConfig: {
      strategy: "fixed",
      modifiers: [{ name: "offset", options: { offset: [0, 8] } }],
    },
  });

  if (!meta.hasShown) return null;

  const placement = meta.popper?.placement ?? "";
  const show = meta.show;
  const alignEnd = meta.alignEnd;

  const menuContent = (
    <div
      {...menuProps}
      role="menu"
      className={`dropdown-menu ${show ? "show" : ""} ${alignEnd ? "dropdown-menu-right" : ""}`}
      data-x-placement={placement}
      style={{
        ...menuProps.style,
        zIndex: DROPDOWN_MENU_Z,
      }}
    >
      {searchBar && (
        <>
          <div className="px-3 py-2">
            <Form.Control
              type="text"
              placeholder="Search..."
              value={searchText}
              onChange={(e) => onSearchChange(e.target.value)}
              size="sm"
            />
          </div>
          <Dropdown.Divider />
        </>
      )}
      {searchBar ? filteredChildren : children}
    </div>
  );

  return ReactDOM.createPortal(menuContent, document.body);
};
