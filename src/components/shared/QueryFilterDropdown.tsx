// React imports:
import React, { useState } from "react";

import _ from "lodash";

// Icons:
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilter } from "@fortawesome/free-solid-svg-icons";

// Bootstrap imports:
import Dropdown from "react-bootstrap/Dropdown";
import InputGroup from "react-bootstrap/InputGroup";
import Button from "react-bootstrap/Button";

// App imports
import GenericTogglingMenuItem from "./GenericTogglingMenuItem";
import {
  CommonFilterType,
  CommonFilterTypeSimple,
  QueryUtils,
} from "../../utils/QueryUtils";

type Props = {
  queryFilters: CommonFilterType[];
  setQueryFilters: (newQueryFilter: CommonFilterType[]) => void;
  showCustomRangeFilter: () => void;
  showGameSelectorModal?: () => void;
};

const QueryFilterDropdown: React.FunctionComponent<Props> = ({
  queryFilters,
  setQueryFilters,
  showCustomRangeFilter,
  showGameSelectorModal,
}) => {
  const filterMenuItem = (item: CommonFilterTypeSimple, text: String) => {
    return (
      <GenericTogglingMenuItem
        text={text}
        truthVal={QueryUtils.filterHas(queryFilters, item)}
        onSelect={() =>
          setQueryFilters(QueryUtils.toggleFilter(queryFilters, item))
        }
      />
    );
  };

  return (
    <Dropdown
      as={InputGroup.Append}
      variant="outline-secondary"
      alignRight
      style={{ maxHeight: "2.4rem" }}
    >
      <Dropdown.Toggle variant="outline-secondary" id="dropdown-basic">
        <FontAwesomeIcon icon={faFilter} />
      </Dropdown.Toggle>
      <Dropdown.Menu>
        <Dropdown.Item as={Button}>
          <div
            onClick={() => {
              setQueryFilters([]);
            }}
          >
            <span>Clear all query filters</span>
          </div>
        </Dropdown.Item>
        {showGameSelectorModal ? <Dropdown.Divider /> : undefined}
        {showGameSelectorModal ? (
          <GenericTogglingMenuItem
            text="Select Games..."
            truthVal={QueryUtils.filterHas(
              queryFilters,
              QueryUtils.customGamesAliasName
            )}
            onSelect={() => showGameSelectorModal()}
          />
        ) : undefined}
        <Dropdown.Divider />
        {filterMenuItem("Conf", "Conference games only")}
        <Dropdown.Divider />
        {filterMenuItem("Home", "Home games only")}
        {filterMenuItem("Away", "Away games only")}
        {filterMenuItem("Not-Home", "Away/Neutral games only")}
        <Dropdown.Divider />
        {filterMenuItem("1st-Half", "First half only")}
        {filterMenuItem("2nd-Half", "Second half+")}
        {filterMenuItem("Stretch", "Last 8 minutes of regulation+")}
        <Dropdown.Divider />
        {filterMenuItem("Vs-Good", "Vs T80 teams")}
        {filterMenuItem("Good-Off", "Vs Good Offense")}
        {filterMenuItem("Good-Def", "Vs Good Defense")}
        <Dropdown.Divider />
        <GenericTogglingMenuItem
          text="Custom Date Range..."
          truthVal={QueryUtils.filterHas(
            queryFilters,
            QueryUtils.customDateAliasName
          )}
          onSelect={() => showCustomRangeFilter()}
        />
        {filterMenuItem("Last-30d", "Last 30 days only")}
      </Dropdown.Menu>
    </Dropdown>
  );
};
export default QueryFilterDropdown;
