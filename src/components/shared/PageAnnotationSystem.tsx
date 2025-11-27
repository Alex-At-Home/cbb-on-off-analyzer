// React imports:
import React, { useState, useRef, useEffect } from "react";

// Third-party imports:
import html2canvas from "html2canvas";

// Bootstrap imports:
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit } from "@fortawesome/free-solid-svg-icons";

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

  const captureFullPage = async (): Promise<string> => {
    // Save current scroll position
    const originalScrollX = window.scrollX;
    const originalScrollY = window.scrollY;

    // Scroll to top to capture full page
    window.scrollTo(0, 0);

    // Wait a moment for content to settle
    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      // Use minimal options for most reliable capture
      const canvas = await html2canvas(document.documentElement, {
        useCORS: true,
        allowTaint: true,
        scale: 1,
        logging: true,
        width: window.innerWidth,
        height: Math.max(
          document.body.scrollHeight,
          document.body.offsetHeight,
          document.documentElement.clientHeight,
          document.documentElement.scrollHeight,
          document.documentElement.offsetHeight
        ),
      });

      console.log("Canvas dimensions:", canvas.width, "x", canvas.height);
      console.log(
        "Document dimensions:",
        document.documentElement.scrollWidth,
        "x",
        document.documentElement.scrollHeight
      );
      console.log("Device pixel ratio:", window.devicePixelRatio || 1);

      return canvas.toDataURL("image/png");
    } finally {
      // Restore original scroll position
      window.scrollTo(originalScrollX, originalScrollY);
    }
  };

  //TODO: should move to https://github.com/ailon/markerjs-ui-quick-starts/blob/main/mjsui-quickstart-react-ts/src/Editor.tsx
  // (could at least try applying their styling to see if it fixes Safari)

  const handleAnnotationClick = async () => {
    if (isCapturing) return;

    setIsCapturing(true);

    const isDebug = false;
    try {
      // Capture the full page screenshot
      const imageData = await captureFullPage();

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
        width: ${img.naturalWidth}px;
        height: ${img.naturalHeight}px;
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
          alert("Failed to capture screenshot (code: err1). Please try again.");
          setIsCapturing(false);
        }
      };
    } catch (error) {
      console.error("Screenshot capture failed:", error);
      alert("Failed to capture screenshot (code: err2). Please try again.");
      setIsCapturing(false);
    }
  };

  // Don't render anything during SSR
  if (!isClient) {
    return null;
  }

  return (
    <span
      className={`${className} ${isCapturing ? "text-muted" : "text-primary"}`}
      style={{
        cursor: isCapturing ? "not-allowed" : "pointer",
        marginLeft: "8px",
        ...style,
      }}
      onClick={handleAnnotationClick}
      title={isCapturing ? "Capturing screenshot..." : "Annotate this page"}
    >
      <FontAwesomeIcon icon={faEdit} size="sm" spin={isCapturing} />
    </span>
  );
};

export default PageAnnotationSystem;
