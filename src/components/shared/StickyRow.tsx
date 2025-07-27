// React imports:
import React, { Fragment } from "react";

// Bootstrap imports:
import Form from "react-bootstrap/Form";

import { useTheme } from "next-themes";

type Props = {
  readonly stickyEnabled: boolean;
  readonly className?: string;
  readonly topOffset?: string;
};

const StickyRow: React.FunctionComponent<Props> = ({
  children,
  stickyEnabled,
  className,
  topOffset,
}) => {
  const { theme, setTheme } = useTheme();
  return (
    <Fragment>
      {stickyEnabled ? (
        <Form.Row
          className={`${className || ""} sticky-top d-none d-md-flex`}
          style={{
            position: "sticky",
            top: topOffset || "0em",
            backgroundColor: theme == "dark" ? "#272b30" : "white", //(see bootstrap.dark_united theme)
            opacity: "85%",
            zIndex: 2,
          }}
        >
          {children}
        </Form.Row>
      ) : (
        <Form.Row className={`${className} d-none d-md-flex`}>
          {children}
        </Form.Row>
      )}
      <Form.Row className={`${className} d-md-none`}>{children}</Form.Row>
    </Fragment>
  );
};

export default StickyRow;
