import React from "react";
import Overlay from "react-bootstrap/Overlay";
import Popover from "react-bootstrap/Popover";
import ListGroup from "react-bootstrap/ListGroup";

/** A single sort option */
export type TableSortOption = {
  label: string;
  value: string;
};

/** State for the TableSortPopupMenu - set to undefined to hide the menu */
export type TableSortPopupMenuState = {
  /** The column key that was clicked */
  columnKey: string;
  /** The available sort options for this column */
  options: TableSortOption[];
  /** The element to anchor the popover to */
  anchorEl: HTMLElement | null;
  /** Optional: the currently selected sort value (to highlight in the menu) */
  currentSortValue?: string;
};

export type TableSortPopupMenuProps = {
  /** The menu state - undefined means hidden */
  state: TableSortPopupMenuState | undefined;
  /** Called when a sort option is clicked */
  onClick: (selectedValue: string) => void;
  /** Called when the menu should be closed (click outside, escape, etc.) */
  onClose: () => void;
};

/**
 * A popup menu for selecting sort options when clicking on a table header.
 *
 * Usage:
 * ```tsx
 * const [sortMenuState, setSortMenuState] = useState<TableSortPopupMenuState | undefined>(undefined);
 *
 * const handleHeaderClick = (columnKey: string, ev: React.MouseEvent) => {
 *   const matchingOptions = findSortOptionsForColumn(columnKey);
 *   if (matchingOptions.length > 0) {
 *     setSortMenuState({
 *       columnKey,
 *       options: matchingOptions,
 *       anchorEl: ev.currentTarget as HTMLElement,
 *       currentSortValue: currentSortBy,
 *     });
 *   }
 * };
 *
 * const handleSortSelect = (value: string) => {
 *   setSortBy(value);
 *   setSortMenuState(undefined);
 * };
 *
 * // In render:
 * <GenericTable onHeaderClick={handleHeaderClick} ... />
 * <TableSortPopupMenu
 *   state={sortMenuState}
 *   onClick={handleSortSelect}
 *   onClose={() => setSortMenuState(undefined)}
 * />
 * ```
 */
const TableSortPopupMenu: React.FC<TableSortPopupMenuProps> = ({
  state,
  onClick,
  onClose,
}) => {
  if (!state) {
    return null;
  }

  return (
    <Overlay
      show={!!state}
      target={state.anchorEl}
      placement="bottom-start"
      rootClose
      onHide={onClose}
    >
      <Popover id="table-sort-popup-menu">
        <Popover.Content
          style={{ padding: 0, maxHeight: "300px", overflowY: "auto" }}
        >
          <ListGroup variant="flush">
            {state.options.map((opt) => (
              <ListGroup.Item
                key={opt.value}
                action
                active={state.currentSortValue === opt.value}
                onClick={() => onClick(opt.value)}
                style={{ cursor: "pointer", fontSize: "0.9em" }}
              >
                {opt.label}
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Popover.Content>
      </Popover>
    </Overlay>
  );
};

export default TableSortPopupMenu;
