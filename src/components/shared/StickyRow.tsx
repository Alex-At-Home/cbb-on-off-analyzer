// React imports:
import React, { Fragment } from "react";

// Bootstrap imports:
import Form from "react-bootstrap/Form";

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
  return (
    <Fragment>
      {stickyEnabled ? (
        <Form.Row
          className={`${
            className || ""
          } sticky-top d-none d-md-flex internal-sticky-overlay`}
          style={{
            position: "sticky",
            top: topOffset || "0em",
            opacity: "95%", //(higher than the 85% i use elsehwere because of the dropdown it usually hosts)
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
