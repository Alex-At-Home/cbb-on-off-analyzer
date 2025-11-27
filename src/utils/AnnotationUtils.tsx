// React imports:
import React from 'react';
import html2canvas from 'html2canvas';

export class AnnotationUtils {
  // Create fullscreen spinner overlay
  static showSpinner = (): HTMLElement => {
    const overlay = document.createElement("div");
    overlay.id = "annotation-spinner-overlay";
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
  static hideSpinner = (): void => {
    const overlay = document.getElementById("annotation-spinner-overlay");
    if (overlay) {
      document.body.removeChild(overlay);
    }
  };

  // Capture visible screen only
  static captureVisibleScreen = async (): Promise<string> => {
    const canvas = await html2canvas(document.documentElement, {
      useCORS: true,
      allowTaint: true,
      scale: 1,
      logging: false,
      x: window.scrollX,
      y: window.scrollY,
      width: window.innerWidth,
      height: window.innerHeight,
      ignoreElements: (element) => {
        return element.id === "annotation-spinner-overlay";
      },
    });

    console.log(
      "Visible screen captured from viewport:",
      window.scrollX,
      window.scrollY,
      "to",
      window.scrollX + window.innerWidth,
      window.scrollY + window.innerHeight,
      "- size:",
      canvas.width,
      "x",
      canvas.height
    );
    return canvas.toDataURL("image/png");
  };

  // Capture full page
  static captureFullPage = async (): Promise<string> => {
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
          return element.id === "annotation-spinner-overlay";
        },
      });

      console.log("Full page captured:", canvas.width, "x", canvas.height);
      return canvas.toDataURL("image/png");
    } finally {
      // Restore original scroll position
      window.scrollTo(originalScrollX, originalScrollY);
    }
  };

  // Main annotation handler with spinner
  static handleAnnotation = async (
    captureType: "visible" | "fullpage",
    setIsCapturing?: (capturing: boolean) => void
  ): Promise<void> => {
    const overlay = AnnotationUtils.showSpinner();

    // Use setTimeout to ensure spinner renders before starting processing
    setTimeout(async () => {
      try {
        // Capture screenshot based on selected option
        const imageData = await (captureType === "visible"
          ? AnnotationUtils.captureVisibleScreen()
          : AnnotationUtils.captureFullPage());

        // Create a temporary image element for marker.js
        const img = document.createElement("img");
        img.src = imageData;

        const container = document.createElement("div");
        document.body.appendChild(container);

        // Wait for image to load
        img.onload = async () => {
          // Now set container size based on viewport for scrollable annotation
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

            // Display image at EXACT native size for accurate coordinates
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

            // Close handler
            editor.addEventListener("editorclose", () => {
              document.body.removeChild(container);
              AnnotationUtils.hideSpinner();
              setIsCapturing?.(false);
            });

            // Save handler
            editor.addEventListener("editorsave", (event: any) => {
              const dataUrl = event.detail.dataUrl;
              if (dataUrl) {
                const link = document.createElement("a");
                link.href = dataUrl;
                link.download = "annotation.png";
                link.click();
              }
            });

            // Add the editor to container
            container.appendChild(editor);

            // Scroll to top-left to show full page view initially
            container.scrollTop = 0;
            container.scrollLeft = 0;

            AnnotationUtils.hideSpinner();
            setIsCapturing?.(false);
          } catch (markerError) {
            console.error("AnnotationEditor initialization failed:", markerError);
            AnnotationUtils.hideSpinner();
            alert("Failed to load annotation editor. Please try again.");
            setIsCapturing?.(false);
          }
        };
      } catch (error) {
        console.error("Screenshot capture failed:", error);
        AnnotationUtils.hideSpinner();
        alert("Failed to capture screenshot. Please try again.");
        setIsCapturing?.(false);
      }
    }, 100);
  };
}
