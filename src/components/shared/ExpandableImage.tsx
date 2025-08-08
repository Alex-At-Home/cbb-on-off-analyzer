// React imports:
import React, { useState } from "react";
import { Col, Container, Row } from "react-bootstrap";

//@ts-ignore

type Props = {
  src: string;
  caption: string;
};

const ExpandableImage: React.FunctionComponent<any> = (props: Props) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  return isOpen ? (
    <>
      <a
        className="card-body-link"
        href="#"
        onClick={(e: any) => {
          e.preventDefault();
          setIsOpen(false);
        }}
      >
        [Hide Image]
      </a>
      <br />
      <Container>
        <Row>
          <Col className="text-center">
            <small>
              <i>{props.caption}</i>
            </small>
          </Col>
        </Row>
        <Row>
          <img
            style={{ width: "100%" }}
            onClick={(e: any) => {
              e.preventDefault();
              setIsOpen(false);
            }}
            src={props.src}
          />
        </Row>
      </Container>
    </>
  ) : (
    <a
      className="card-body-link"
      href="#"
      onClick={(e: any) => {
        e.preventDefault();
        setIsOpen(true);
      }}
    >
      [Show Image]
    </a>
  );
};
export default ExpandableImage;
