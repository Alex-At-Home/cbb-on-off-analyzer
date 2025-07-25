// React imports:
import React, { useState } from "react";

// Next imports:
import { NextPage } from "next";

// Bootstrap imports:
import Card from "react-bootstrap/Card";
import Collapse from "react-bootstrap/Collapse";
import Container from "react-bootstrap/Container";

type Props = {
  /** Much smaller margin => looks good for table-oriented displays */
  readonly minimizeMargin: boolean;
  readonly screenSize?: "wide_screen" | "medium_screen";
  readonly title: string;
  readonly summary?: string;
  readonly helpLink?: string;
  readonly startClosed?: boolean;
  readonly onShowHide?: (nowShown: boolean) => void;
};

const GenericCollapsibleCard: React.FunctionComponent<Props> = ({
  children,
  minimizeMargin,
  screenSize,
  title,
  summary,
  helpLink,
  startClosed,
  onShowHide,
}) => {
  const [showTable, toggleShowTable] = useState(
    undefined == startClosed || !startClosed
  );

  const showSummaryIfHidden = () => {
    if (!showTable && summary) {
      return <div className="">{summary}</div>;
    }
  };
  const optionalHelpLink = () => {
    if (helpLink) {
      return (
        <span className="float-right">
          <a target="_blank" href={helpLink}>
            <small>(?)</small>
          </a>
        </span>
      );
    }
  };

  const cardBodyStyle = minimizeMargin
    ? { paddingLeft: "5px", paddingRight: "5px" }
    : {};
  const containerStyle = minimizeMargin
    ? { paddingLeft: 0, paddingRight: 0 }
    : {};
  const titleStyle = minimizeMargin
    ? { paddingLeft: "15px", paddingRight: "15px" }
    : {};

  return (
    <Card className="w-100">
      <Card.Body style={cardBodyStyle}>
        <Card.Title style={titleStyle}>
          <span>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                const newSetting = !showTable;
                toggleShowTable(newSetting);
                if (onShowHide) onShowHide(newSetting);
                return false;
              }}
            >
              ({showTable ? "+" : "-"}) {title}
            </a>
          </span>
          {optionalHelpLink()}
        </Card.Title>
        {showSummaryIfHidden()}
        <Collapse in={showTable}>
          <Container className={`${screenSize || ""}`} style={containerStyle}>
            {children}
          </Container>
        </Collapse>
      </Card.Body>
    </Card>
  );
};

export default GenericCollapsibleCard;
