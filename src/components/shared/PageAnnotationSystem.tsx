// React imports:
import React, { useState, useRef, useEffect } from "react";

// Third-party imports:
import html2canvas from "html2canvas";
import { AnnotationState, Renderer } from "@markerjs/markerjs3";

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

  const handleAnnotationClick = async () => {
    if (isCapturing) return;

    setIsCapturing(true);

    try {
      // Capture the full page screenshot
      const imageData = await captureFullPage();

      const style = document.createElement("style");
      style.textContent = `
  .markerjs-annotation-editor,
  .markerjs-annotation-editor * {
    all: unset !important;
    box-sizing: border-box !important;
  }
  .markerjs-annotation-editor svg {
    display: block !important;
    position: absolute !important;
  transform: none !important;
  }


        :not(svg),
        :not(foreignObject) > svg {
          transform-origin-x: 0px !important;
          transform-origin-y: 0px !important;
          transform-box: view-box !important;
        }
      `;
      document.head.appendChild(style);

      // Create a temporary image element for marker.js
      const img = document.createElement("img");
      /**/
      img.src = imageData;
      //img.src = "https://react-demos.markerjs.com/sample-images/phone-modules.jpg";
      // img.src =
      //   "https://markerjs.com/_next/static/media/sample-mockup.c1ab8bdc.png";
      // Create a full-screen container for the annotation
      const container = document.createElement("div");
      document.body.appendChild(container);

      // Wait for image to load
      img.onload = async () => {
        /**/
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

        // Add close button (defined here so it's available in both try and catch blocks)
        const closeBtn = document.createElement("button");
        closeBtn.textContent = "✕ Close Annotation";
        closeBtn.style.cssText = `
          position: fixed;
          top: 10px;
          right: 10px;
          padding: 10px 20px;
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          z-index: 10001;
          font-size: 14px;
          font-weight: bold;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;

        closeBtn.onclick = () => {
          document.body.removeChild(container);
          setIsCapturing(false);
        };

        try {
          // Dynamic import to avoid SSR issues
          const { AnnotationEditor } = await import("@markerjs/markerjs-ui");

          // Log dimensions for debugging
          console.log(
            "Image natural size:",
            img.naturalWidth,
            "x",
            img.naturalHeight
          );

          // CRITICAL: Display image at EXACT native size for accurate coordinates
          // marker.js expects 1:1 pixel mapping between image and coordinates
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
          //             width: 100vw;
          // height: 100vh;
          // width: ${img.naturalWidth}px;
          // height: ${img.naturalHeight}px;

          console.log(
            "Displaying image at native size for accurate coordinates"
          );

          // Create the annotation editor using the correct v3 API
          const editor = new AnnotationEditor();
          // editor.markerArea.targetHeight = img.naturalHeight;
          // editor.markerArea.targetWidth = img.naturalWidth;
          // editor.settings.rendererSettings.naturalSize = true;

          editor.targetImage = img;

          // Add the editor, instructions, and close button to container
          container.appendChild(editor);
          container.appendChild(closeBtn);

          // Scroll to top-left to show full page view initially
          container.scrollTop = 0;
          container.scrollLeft = 0;

          console.log(
            "Image natural:",
            img.naturalWidth,
            "x",
            img.naturalHeight
          );
          console.log("Image display:", img.offsetWidth, "x", img.offsetHeight);
          console.log(
            "Container size:",
            container.offsetWidth,
            "x",
            container.offsetHeight
          );

          setTimeout(() => {
            console.log("Checking SVG size...");
            const editor2 = editor.shadowRoot?.querySelector("mjs-marker-area");
            if (editor2) {
              console.log("FOUND EDITOR2");
              const svg = editor2.shadowRoot?.querySelector(
                "div > div.canvas-container > svg"
              );
              if (svg) {
                console.log("FOUND SVG");

                const ctm = (svg as any).getScreenCTM();

                const scaleX = 1 / ctm.a;
                const scaleY = 1 / ctm.d;
                const offsetX = -ctm.e;
                const offsetY = -ctm.f;

                // Apply a wrapper transform to pre-compensate
                //svg.style.transform = `matrix(${scaleX}, 0, 0, ${scaleY}, ${offsetX}px, ${offsetY}px)`;

                // Snap the container to integers
                const rect = container.getBoundingClientRect();
                container.style.width = Math.round(rect.width) + "px";
                container.style.height = Math.round(rect.height) + "px";

                // Inject styles to neutralize Safari CTM drift
                const style = document.createElement("style");
                //           style.textContent = `
                //   svg {
                //     transform: matrix(${scaleX}, 0, 0, ${scaleY}, ${offsetX}px, ${offsetY}px) !important;
                //   }
                // `;

                editor2.shadowRoot?.appendChild(style);
              }
            }
          }, 100);
        } catch (markerError) {
          console.error("AnnotationEditor initialization failed:", markerError);
          // (DO NOTHING ELSE HERE, WILL ADD CODE ONLY IF NEEDED)
        }
      };
    } catch (error) {
      console.error("Screenshot capture failed:", error);
      alert("Failed to capture screenshot. Please try again.");
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
