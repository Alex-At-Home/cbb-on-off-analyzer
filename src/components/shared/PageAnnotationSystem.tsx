// React imports:
import React, { useState, useEffect } from "react";

// Bootstrap imports:
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit } from "@fortawesome/free-solid-svg-icons";
import { Dropdown } from "react-bootstrap";
import { AnnotationUtils } from "../../utils/AnnotationUtils";

type Props = {
  className?: string;
  style?: React.CSSProperties;
};

const PageAnnotationSystem: React.FunctionComponent<Props> = ({
  className = "",
  style = {},
}) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Add CSS to ensure dropdown items have proper z-index
    if (typeof document !== 'undefined' && !document.getElementById('annotation-dropdown-styles')) {
      const style = document.createElement('style');
      style.id = 'annotation-dropdown-styles';
      style.textContent = `
        .annotation-dropdown-menu .dropdown-item {
          z-index: 2001 !important;
          position: relative !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const handleAnnotation = async (captureType: "visible" | "fullpage") => {
    if (isCapturing) return;
    setIsCapturing(true);
    await AnnotationUtils.handleAnnotation(captureType, setIsCapturing);
  };

  if (!isClient) {
    return null;
  }

  return (
    <Dropdown
      className={className}
      style={{ display: "inline-block", marginLeft: "8px", ...style }}
      drop="down"
    >
      <Dropdown.Toggle
        variant="link"
        size="sm"
        className={`p-0 border-0 ${
          isCapturing ? "text-muted" : "text-primary"
        }`}
        style={{
          cursor: isCapturing ? "not-allowed" : "pointer",
          textDecoration: "none",
        }}
        disabled={isCapturing}
        title={isCapturing ? "Processing..." : "Annotate this page"}
      >
        <FontAwesomeIcon icon={faEdit} size="sm" />
      </Dropdown.Toggle>

      <Dropdown.Menu 
        style={{ 
          zIndex: 2000,
          position: 'fixed' // Break out of stacking context
        }        }
        popperConfig={{
          strategy: 'fixed',
          modifiers: [
            {
              name: 'offset',
              options: {
                offset: [0, 8],
              },
            },
          ],
        }}
      >
        <Dropdown.Item
          onClick={() => handleAnnotation("visible")}
          disabled={isCapturing}
          style={{ zIndex: 2001, position: 'relative' }}
        >
          📱 Annotate visible screen
        </Dropdown.Item>

        <Dropdown.Item
          onClick={() => handleAnnotation("fullpage")}
          disabled={isCapturing}
          style={{ zIndex: 2001, position: 'relative' }}
        >
          📄 Annotate full page (can be slow)
        </Dropdown.Item>

        <Dropdown.Item disabled className="text-muted font-italic small">
          Note: doesn't work well in Safari or Mobile
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default PageAnnotationSystem;