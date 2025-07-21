// React imports:
import React, { useEffect, useState } from 'react';

// Lodash:
import _ from 'lodash';

// Bootstrap imports:
import Modal from 'react-bootstrap/Modal';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Carousel from 'react-bootstrap/Carousel';

// Define the props for image items in the carousel
interface CarouselImageItem {
  src: string;
  text: string;
}

// Define the props for the component
export interface MoreDetailsProps {
  content: React.ReactElement; // The content to be displayed on the left
  imageList?: CarouselImageItem[]; // Optional list of images with text for the carousel
}

// Main component props
interface LandingPageMoreDetailsProps extends MoreDetailsProps {
  show: boolean;
  onHide: () => void;
}

const LandingPageMoreDetails: React.FC<LandingPageMoreDetailsProps> = ({
  content,
  imageList,
  show,
  onHide,
  ...props
}) => {
  // State to track if screen is XL size
  const [isXlScreen, setIsXlScreen] = useState<boolean>(false);

  // Check screen size on mount and window resize
  useEffect(() => {
    const checkScreenSize = () => {
      // Bootstrap xl breakpoint is 1200px
      setIsXlScreen(window.innerWidth >= 1200);
    };
    
    // Initial check
    checkScreenSize();
    
    // Add event listener for resize
    window.addEventListener('resize', checkScreenSize);
    
    // Cleanup event listener on unmount
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);
  
  // Determine if carousel should be shown (screen is xl and imageList is not empty)
  const showCarousel = isXlScreen && !_.isEmpty(imageList);

  return (
    <Modal
      size="xl"
      show={show}
      onHide={onHide}
      onEntered={() => {
        document.body.style.overflow = "scroll";
      }}
      {...props}
    >
      <Modal.Header closeButton>
        <Modal.Title>More Details</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Container>
          <Row>
            {/* Content section - takes full width if no carousel, otherwise col-7 */}
            <Col xs={12} xl={showCarousel ? 7 : 12}>
              {content}
            </Col>
            
            {/* Carousel section - only shown on xl screens and if imageList is not empty */}
            {showCarousel && (
              <Col xs={12} xl={5}>
                <Carousel>
                  {imageList?.map((item, index) => (
                    <Carousel.Item key={index}>
                      <img
                        className="d-block w-100"
                        src={item.src}
                        alt={`Slide ${index + 1}`}
                      />
                      <Carousel.Caption>
                        <p>{item.text}</p>
                      </Carousel.Caption>
                    </Carousel.Item>
                  ))}
                </Carousel>
              </Col>
            )}
          </Row>
        </Container>
      </Modal.Body>
    </Modal>
  );
};

export default LandingPageMoreDetails;
