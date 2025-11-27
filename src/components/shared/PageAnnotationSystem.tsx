// React imports:
import React, { useState, useRef, useEffect } from "react";

// Third-party imports:
import html2canvas from "html2canvas";

// Bootstrap imports:
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit } from "@fortawesome/free-solid-svg-icons";
import { Dropdown } from "react-bootstrap";
// import LoadingOverlay from "@ronchalant/react-loading-overlay"; // Using custom DOM spinner instead

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

  // Ensure this only runs on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Create fullscreen spinner overlay
  const showSpinner = () => {
    const overlay = document.createElement('div');
    overlay.id = 'annotation-spinner-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.5);
      z-index: 9998;
      display: flex;
      justify-content: center;
      align-items: center;
      color: white;
      font-size: 18px;
    `;
    
    overlay.innerHTML = `
      <div style="text-align: center;">
        <div style="
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px auto;
        "></div>
        <div>Rendering annotable image...</div>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
    
    document.body.appendChild(overlay);
    return overlay;
  };

  // Remove spinner overlay
  const hideSpinner = () => {
    const overlay = document.getElementById('annotation-spinner-overlay');
    if (overlay) {
      document.body.removeChild(overlay);
    }
  };

  // Capture visible screen only
  const captureVisibleScreen = async (): Promise<string> => {
    const canvas = await html2canvas(document.body, {
      useCORS: true,
      allowTaint: true,
      scale: 1,
      logging: false,
      width: window.innerWidth,
      height: window.innerHeight,
      ignoreElements: (element) => {
        // Exclude spinner overlay from capture
        return element.id === 'annotation-spinner-overlay';
      },
    });

    console.log("Visible screen captured:", canvas.width, "x", canvas.height);
    return canvas.toDataURL("image/png");
  };

  // Capture full page
  const captureFullPage = async (): Promise<string> => {
    // Save current scroll position
    const originalScrollX = window.scrollX;
    const originalScrollY = window.scrollY;

    // Scroll to top to capture full page
    window.scrollTo(0, 0);

    // Wait a moment for content to settle
    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      // Use minimal options for most reliable capture - capture FULL document dimensions
      const canvas = await html2canvas(document.documentElement, {
        useCORS: true,
        allowTaint: true,
        scale: 1,
        width: window.innerWidth,
        height: Math.max(
          document.body.scrollHeight,
          document.body.offsetHeight,
          document.documentElement.clientHeight,
          document.documentElement.scrollHeight,
          document.documentElement.offsetHeight
        ),
        logging: false,
        // Don't constrain width/height - let html2canvas capture full document
        ignoreElements: (element) => {
          // Exclude spinner overlay from capture
          return element.id === 'annotation-spinner-overlay';
        },
      });

      console.log("Full page captured:", canvas.width, "x", canvas.height);
      return canvas.toDataURL("image/png");
    } finally {
      // Restore original scroll position
      window.scrollTo(originalScrollX, originalScrollY);
    }
  };

  //TODO: should move to https://github.com/ailon/markerjs-ui-quick-starts/blob/main/mjsui-quickstart-react-ts/src/Editor.tsx
  // (could at least try applying their styling to see if it fixes Safari)

  // Main annotation handler with spinner
  const handleAnnotation = async (captureType: 'visible' | 'fullpage') => {
    if (isCapturing) return;

    setIsCapturing(true);
    const overlay = showSpinner();

    // Use setTimeout to ensure spinner renders before starting processing
    setTimeout(async () => {

    const isDebug = false;
      try {
        // Capture screenshot based on selected option
        const imageData = await (captureType === 'visible' ? captureVisibleScreen() : captureFullPage());

      // Create a temporary image element for marker.js
      const img = document.createElement("img");
      img.src = imageData;
      //(demo image)
      //img.src = "https://react-demos.markerjs.com/sample-images/phone-modules.jpg";

      const container = document.createElement("div");

      //(note in demo container has inherited this style from somewhere:
      //       :not(svg),
      //       :not(foreignObject) > svg {
      //         transform-origin-x: 0px !important;
      //         transform-origin-y: 0px !important;
      //         transform-box: view-box !important;
      //       }
      // (but this doesn't fix Safari and isn't needed in Chrome)

      document.body.appendChild(container);

      // Wait for image to load
      img.onload = async () => {
        // Now set container size based on image height/width
        container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: #f8f9fa;
        z-index: 9999;
        box-sizing: border-box;
        overflow: auto;
        margin: 0;
        padding: 0;
      `;

        try {
          // Dynamic import to avoid SSR issues
          const { AnnotationEditor } = await import("@markerjs/markerjs-ui");

          // Log dimensions for debugging
          if (isDebug) {
            console.log(
              "Image natural size:",
              img.naturalWidth,
              "x",
              img.naturalHeight
            );
          }

          // Display image at EXACT native size for accurate coordinates
          // marker.js expects 1:1 pixel mapping between image and coordinates
          // (in practice this doesn't seem to do anything?)
          img.style.cssText = `
            display: block;
            margin: 0;
            padding: 0;
            border: none;
            width: ${img.naturalWidth}px;
            height: ${img.naturalHeight}px;
            max-width: none;
            max-height: none;
          `;

          // Create the annotation editor using the correct v3 API
          const editor = new AnnotationEditor();

          editor.targetImage = img;

          // Close:
          editor.addEventListener("editorclose", (event) => {
            document.body.removeChild(container);
            hideSpinner();
            setIsCapturing(false);
          });

          // Save:
          editor.addEventListener("editorsave", (event) => {
            const link = document.createElement("a");
            const annotation = event.detail.state;
            const dataUrl = event.detail.dataUrl;
            if (dataUrl) {
              link.href = dataUrl;
              link.download = "annotation.png";
              link.click();
            }
          });

          // Add the editor, instructions, and close button to container
          container.appendChild(editor);

          // Scroll to top-left to show full page view initially
          container.scrollTop = 0;
          container.scrollLeft = 0;

          if (isDebug) {
            console.log(
              "Image natural:",
              img.naturalWidth,
              "x",
              img.naturalHeight
            );
            console.log(
              "Image display:",
              img.offsetWidth,
              "x",
              img.offsetHeight
            );
            console.log(
              "Container size:",
              container.offsetWidth,
              "x",
              container.offsetHeight
            );
          }
        } catch (markerError) {
          console.error("AnnotationEditor initialization failed:", markerError);
          hideSpinner();
          alert("Failed to load annotation editor. Please try again.");
          setIsCapturing(false);
        }
      };
      } catch (error) {
        console.error("Screenshot capture failed:", error);
        hideSpinner();
        alert("Failed to capture screenshot. Please try again.");
        setIsCapturing(false);
      }
    }, 100);
  };

  // Don't render anything during SSR
  if (!isClient) {
    return null;
  }

  return (
    <Dropdown
      className={className}
      style={{ display: 'inline-block', marginLeft: '8px', ...style }}
      drop="down"
    >
      <Dropdown.Toggle
        variant="link" 
        size="sm"
        className={`p-0 border-0 ${isCapturing ? "text-muted" : "text-primary"}`}
        style={{
          cursor: isCapturing ? "not-allowed" : "pointer",
          textDecoration: 'none'
        }}
        disabled={isCapturing}
        title={isCapturing ? "Processing..." : "Annotate this page"}
      >
        <FontAwesomeIcon icon={faEdit} size="sm"/>
      </Dropdown.Toggle>

      <Dropdown.Menu>
        <Dropdown.Item
          onClick={() => handleAnnotation('visible')}
          disabled={isCapturing}
        >
          📱 Annotate visible screen
        </Dropdown.Item>
        
        <Dropdown.Item
          onClick={() => handleAnnotation('fullpage')}
          disabled={isCapturing}
        >
          📄 Annotate full page (can be slow)
        </Dropdown.Item>
        
        <Dropdown.Item disabled className="text-muted font-italic small">
          Note: doesn't work well in Safari
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default PageAnnotationSystem;
