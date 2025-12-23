// React imports:
import React, { ReactNode, useEffect, useState } from "react";

// Next imports:
import { NextPage } from "next";

// Bootstrap imports:

import {
  Dropdown,
  Form,
  InputGroup,
  OverlayTrigger,
  Tooltip,
} from "react-bootstrap";
import AdvancedFilterAutoSuggestText, {
  notFromFilterAutoSuggest,
} from "./AdvancedFilterAutoSuggestText";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconDefinition } from "@fortawesome/fontawesome-common-types";
import {
  faCheck,
  faExclamation,
  faFilter,
} from "@fortawesome/free-solid-svg-icons";
import GenericTogglingMenuItem from "./GenericTogglingMenuItem";
import GenericTogglingMenu from "./GenericTogglingMenu";

type Props = {
  readonly label?: string;
  readonly prompt: string;
  readonly value: string;
  readonly error?: string;
  readonly autocomplete: string[];
  readonly richTextReplacements?: Record<string, { renderTo: ReactNode }>;
  readonly presets?: Array<[string, string]>;
  readonly presetsIcon?: IconDefinition;
  readonly presetsTooltip?: React.JSX.Element;
  readonly syncEvent?: number; //(1-up this to apply the temp contents)
  readonly callback: (newExpr: string, onSync?: boolean) => void; //(if onSync shouldn't set any sync events)
  readonly showHelp?: boolean;
  readonly searchBar?: boolean;
};

const LinqExpressionBuilder: React.FunctionComponent<Props> = ({
  label,
  prompt,
  value,
  error,
  autocomplete,
  richTextReplacements,
  presets,
  presetsIcon,
  presetsTooltip,
  syncEvent,
  callback,
  showHelp,
  searchBar,
}) => {
  const [tmpAdvancedFilterStr, setTmpAdvancedFilterStr] = useState(value);

  useEffect(() => {
    if (value != tmpAdvancedFilterStr) {
      callback(tmpAdvancedFilterStr, true);
    }
  }, [syncEvent]);

  useEffect(() => {
    if (value != tmpAdvancedFilterStr) {
      setTmpAdvancedFilterStr(value);
    }
  }, [value]);

  /** Keyboard listener - handles global page overrides while supporting individual components */
  const submitListenerFactory = (inAutoSuggest: boolean) => (event: any) => {
    const allowKeypress = () => {
      //(if this logic is run inside AutoSuggestText, we've already processed the special cases so carry on)
      return inAutoSuggest || notFromFilterAutoSuggest(event);
    };
    if (
      event.code === "Enter" ||
      event.code === "NumpadEnter" ||
      event.keyCode == 13 ||
      event.keyCode == 14
    ) {
      if (allowKeypress() && tmpAdvancedFilterStr != value) {
        callback(tmpAdvancedFilterStr);
      } else if (event && event.preventDefault) {
        event.preventDefault();
      }
    } else if (event.code == "Escape" || event.keyCode == 27) {
      if (allowKeypress()) {
        document.body.click(); //closes any overlays (like history) that have rootClick
      }
    }
  };

  const buildFilterPresetMenuItem = (name: string, advancedFilter: string) => {
    return (
      <GenericTogglingMenuItem
        text={name}
        truthVal={advancedFilter == value}
        onSelect={() => {
          if (advancedFilter != value) {
            setTmpAdvancedFilterStr(advancedFilter);
            callback(advancedFilter);
          }
        }}
      />
    );
  };

  const tooltipForFilterPresets = (
    <Tooltip id="advancedFilterPresets">Preset options</Tooltip>
  );

  const editingAdvFilterTooltip = (
    <Tooltip id="editingAdvFilterTooltip">
      Press enter to apply this Linq filter
    </Tooltip>
  );
  const doneAdvFilterTooltip = (
    <Tooltip id="doneAdvFilterTooltip">Filter successfully applied</Tooltip>
  );
  const errorAdvFilterTooltip = (
    <Tooltip id="errorAdvFilterTooltip">
      Malformed Linq query: [{error || ""}]
    </Tooltip>
  );
  const editingAdvFilterText = (
    <OverlayTrigger placement="auto" overlay={editingAdvFilterTooltip}>
      <div>...</div>
    </OverlayTrigger>
  );
  const doneAdvFilterText = error ? (
    <OverlayTrigger placement="auto" overlay={errorAdvFilterTooltip}>
      <FontAwesomeIcon icon={faExclamation} />
    </OverlayTrigger>
  ) : (
    <OverlayTrigger placement="auto" overlay={doneAdvFilterTooltip}>
      <FontAwesomeIcon icon={faCheck} />
    </OverlayTrigger>
  );

  return (
    <InputGroup className="flex-nowrap">
      <InputGroup.Prepend>
        {label ? (
          <InputGroup.Text style={{ maxHeight: "2.4rem" }}>
            {label}
            {showHelp ? (
              <sup>
                <a
                  target="_blank"
                  href="https://hoop-explorer.blogspot.com/2022/03/"
                >
                  ?
                </a>
              </sup>
            ) : undefined}
          </InputGroup.Text>
        ) : null}
        <InputGroup.Text style={{ maxHeight: "2.4rem" }}>
          {value != tmpAdvancedFilterStr
            ? editingAdvFilterText
            : doneAdvFilterText}
        </InputGroup.Text>
      </InputGroup.Prepend>
      <div className="flex-fill">
        <AdvancedFilterAutoSuggestText
          readOnly={false}
          placeholder={prompt}
          autocomplete={autocomplete}
          richTextReplacements={richTextReplacements}
          value={tmpAdvancedFilterStr}
          onChange={(ev: any) => setTmpAdvancedFilterStr(ev.target.value)}
          onKeyUp={(ev: any) => setTmpAdvancedFilterStr(ev.target.value)}
          onKeyDown={submitListenerFactory(true)}
        />
      </div>
      {presets ? (
        <InputGroup.Append>
          <GenericTogglingMenu
            style={{ maxHeight: "2.4rem" }}
            label={<FontAwesomeIcon icon={presetsIcon || faFilter} />}
            drop="down"
            closeOnSelect={true}
            tooltip={presetsTooltip || tooltipForFilterPresets}
            searchBar={searchBar || false}
            allowlist={["Clear selection"]}
          >
            <GenericTogglingMenuItem
              text={<i>Clear selection</i>}
              truthVal={false}
              onSelect={() => {
                if (value != "") {
                  setTmpAdvancedFilterStr("");
                  callback("");
                }
              }}
            />
            {presets.map((preset) => buildFilterPresetMenuItem(...preset))}
          </GenericTogglingMenu>
        </InputGroup.Append>
      ) : null}
    </InputGroup>
  );
};

export default LinqExpressionBuilder;
