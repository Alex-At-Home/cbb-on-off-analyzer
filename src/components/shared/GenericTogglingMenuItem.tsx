// React imports:
import React, { useState } from "react";

// Next imports:
import { NextPage } from "next";

// Lodash
import _ from "lodash";

// Bootstrap imports:
import Dropdown from "react-bootstrap/Dropdown";
import Button from "react-bootstrap/Button";

// Other imports
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons";

type Props = {
  readonly text: string | React.ReactNode;
  readonly className?: string;
  readonly truthVal: boolean;
  readonly onSelect: () => void;
  readonly disabled?: boolean;
  readonly helpLink?: string;
};

const GenericTogglingMenuItem: React.FunctionComponent<Props> = ({
  text,
  className,
  truthVal,
  onSelect,
  disabled,
  helpLink,
}) => {
  return (
    <Dropdown.Item as={Button} disabled={disabled} className={className}>
      <div
        onClick={(e: any) => {
          if (!e.target.href) onSelect();
        }}
      >
        {_.isString(text) ? <span>{text}</span> : text}
        {helpLink ? (
          <span>
            &nbsp;
            <a target="_blank" href={helpLink}>
              (?)
            </a>
          </span>
        ) : null}
        <span>&nbsp;&nbsp;&nbsp;&nbsp;</span>
        {truthVal ? <FontAwesomeIcon icon={faCheck} /> : null}
      </div>
    </Dropdown.Item>
  );
};

export default GenericTogglingMenuItem;
