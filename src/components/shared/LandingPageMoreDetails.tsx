// React imports:
import React, { useEffect, useState } from "react";

// Lodash:
import _ from "lodash";

// Bootstrap imports:
import Modal from "react-bootstrap/Modal";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Carousel from "react-bootstrap/Carousel";

// Define the props for image items in the carousel
interface CarouselImageItem {
  src: string;
  text: string;
}

// Define the props for the component
export interface MoreDetailsProps {
  title: React.ReactElement | string;
  content: React.ReactElement; // The content to be displayed on the left
  imageList?: CarouselImageItem[]; // Optional list of images with text for the carousel
}

// Main component props
interface LandingPageMoreDetailsProps extends MoreDetailsProps {
  show: boolean;
  onHide: () => void;
}

const LandingPageMoreDetails: React.FC<LandingPageMoreDetailsProps> = ({
  title,
  content,
  imageList,
  show,
  onHide,
  ...props
}) => {
  // State to track if screen is XL size (NOT CURRENTLY USED)
  const [isXlScreen, setIsXlScreen] = useState<boolean>(false);
  const [selectedImage, setSelectedImage] = useState(0);

  // Check screen size on mount and window resize
  useEffect(() => {
    const checkScreenSize = () => {
      // Bootstrap xl breakpoint is 1200px
      setIsXlScreen(window.innerWidth >= 1200);
    };

    // Initial check
    checkScreenSize();

    // Add event listener for resize
    window.addEventListener("resize", checkScreenSize);

    // Cleanup event listener on unmount
    return () => {
      window.removeEventListener("resize", checkScreenSize);
    };
  }, []);

  // Determine if carousel should be shown (imageList is not empty)
  const showCarousel = !_.isEmpty(imageList);

  return (
    <Modal
      size="xl"
      show={show}
      onHide={onHide}
      onEntered={() => {
        document.body.style.overflow = "scroll";
      }}
      {...props}
      className="modal_lower"
    >
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Container>
          <Row>
            {/* Content section - takes full width if no carousel, otherwise col-7 */}
            <Col xs={12}>{content}</Col>
          </Row>
          {/* Carousel section - only shown if imageList is not empty */}
          {showCarousel && (
            <Row className="mb-1">
              <Col xs={12} className="text-center">
                <hr />
                <i>{imageList?.[selectedImage]?.text}</i>
              </Col>
            </Row>
          )}
          {showCarousel && (
            <Row>
              <Col xs={12}>
                <Carousel
                  onSelect={(eventKey: number) => setSelectedImage(eventKey)}
                >
                  {imageList?.map((item, index) => (
                    <Carousel.Item key={index}>
                      <img
                        className="d-block w-100"
                        src={item.src}
                        alt={`Slide ${index + 1}`}
                      />
                    </Carousel.Item>
                  ))}
                </Carousel>
              </Col>
            </Row>
          )}
        </Container>
      </Modal.Body>
    </Modal>
  );
};

export default LandingPageMoreDetails;
