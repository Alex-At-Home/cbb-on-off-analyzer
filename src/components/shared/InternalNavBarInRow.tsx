// Lodash:
import _ from "lodash";
import { Col, Row } from "react-bootstrap";
import PageAnnotationSystem from "./PageAnnotationSystem";

type Props = {
  refs: Record<
    string,
    {
      ref?: React.RefObject<HTMLTableElement | HTMLDivElement> | undefined;
      isLabel?: boolean;
      skip?: boolean;
      offset?: number;
    }
  >;
  showAnnotations?: boolean;
};

const InternalNavBarInRow: React.FunctionComponent<Props> = ({
  refs,
  showAnnotations = false,
}) => {
  return (
    <Row
      className="mt-2 sticky-top small pb-1 internal-sticky-overlay"
      style={{
        opacity: "85%",
        zIndex: 10,
      }}
    >
      <Col xs={showAnnotations ? 10 : 12} className="text-center">
        <div>
          Jump to:{" "}
          {_.map(
            _.keys(refs).filter((ref) => !refs[ref]?.skip),
            (key, idx, array) => {
              return refs[key]?.isLabel ? (
                <span key={`internal-nav-${idx}`}>{key}</span>
              ) : (
                <span key={`internal-nav-${idx}`}>
                  <a
                    href={`#`}
                    onClick={(e) => {
                      e.preventDefault();
                      const refMeta = refs[key];
                      const element = refMeta.ref?.current;
                      if (refMeta && element) {
                        if (
                          _.isNumber(refMeta.offset) &&
                          refMeta.offset != 0 &&
                          typeof window !== "undefined"
                        ) {
                          // Want to skip forward a bit
                          const headerOffset = refMeta.offset;
                          const elementPosition =
                            element.getBoundingClientRect().top;
                          const offsetPosition =
                            elementPosition + window.scrollY - headerOffset;
                          window.scrollTo({
                            top: offsetPosition,
                            behavior: "smooth",
                          });
                        } else {
                          element?.scrollIntoView({ behavior: "smooth" });
                        }
                      }
                    }}
                  >
                    {key}
                  </a>
                  {idx < _.size(array) - 1 && !refs[array?.[idx + 1]]?.isLabel
                    ? " | "
                    : ""}
                </span>
              );
            }
          )}
        </div>
      </Col>
      {showAnnotations && (
        <Col xs={2} className="text-right">
          <PageAnnotationSystem />
        </Col>
      )}
    </Row>
  );
};
export default InternalNavBarInRow;
