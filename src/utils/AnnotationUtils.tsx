// React imports:
import React from "react";
import html2canvas from "html2canvas-pro";
// Note: html2pdf is dynamically imported to avoid SSR issues

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

  // Show save/copy dialog
  static showSaveDialog = (
    dataUrl: string
  ): Promise<"save" | "copy" | "cancel"> => {
    return new Promise((resolve) => {
      // Create modal backdrop
      const backdrop = document.createElement("div");
      backdrop.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10000;
        display: flex;
        justify-content: center;
        align-items: center;
      `;

      // Create modal dialog
      const dialog = document.createElement("div");
      dialog.style.cssText = `
        background: white;
        border-radius: 8px;
        padding: 30px;
        min-width: 400px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      `;

      dialog.innerHTML = `
        <h3 style="margin: 0 0 20px 0; color: #333; text-align: center;">
          Save Annotation
        </h3>
        <p style="margin: 0 0 30px 0; color: #666; text-align: center;">
          How would you like to save your annotated image?
        </p>
        <div style="display: flex; gap: 15px; justify-content: center; margin-bottom: 20px;">
          <button id="save-btn" style="
            padding: 12px 24px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
          ">💾 Save PNG</button>
          <button id="copy-btn" style="
            padding: 12px 24px;
            background: #28a745;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
          ">📋 Copy to Clipboard</button>
        </div>
        <div style="text-align: center;">
          <button id="cancel-btn" style="
            padding: 12px 24px;
            background: #6c757d;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
          ">❌ Cancel</button>
        </div>
      `;

      // Add hover effects
      const buttons = dialog.querySelectorAll("button");
      buttons.forEach((btn) => {
        btn.addEventListener("mouseenter", () => {
          (btn as HTMLElement).style.opacity = "0.8";
        });
        btn.addEventListener("mouseleave", () => {
          (btn as HTMLElement).style.opacity = "1";
        });
      });

      backdrop.appendChild(dialog);
      document.body.appendChild(backdrop);

      const cleanup = () => {
        document.body.removeChild(backdrop);
      };

      // Event handlers
      dialog.querySelector("#save-btn")?.addEventListener("click", () => {
        cleanup();
        resolve("save");
      });

      dialog.querySelector("#copy-btn")?.addEventListener("click", () => {
        cleanup();
        resolve("copy");
      });

      dialog.querySelector("#cancel-btn")?.addEventListener("click", () => {
        cleanup();
        resolve("cancel");
      });

      // Close on backdrop click
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) {
          cleanup();
          resolve("cancel");
        }
      });

      // Close on Escape key
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          document.removeEventListener("keydown", handleEscape);
          cleanup();
          resolve("cancel");
        }
      };
      document.addEventListener("keydown", handleEscape);
    });
  };

  // Generate PDF from image data URL
  /** Unused and didn't work when tested - keeping for potential future use */
  static generatePdfFromImage = async (dataUrl: string): Promise<void> => {
    try {
      // Dynamic import to avoid SSR issues
      const html2pdf = await import("html2pdf.js").then(
        (mod) => mod.default || mod
      );

      // Create a temporary image element to get dimensions
      const img = new Image();

      return new Promise((resolve, reject) => {
        img.onload = async () => {
          try {
            // Create a temporary container with the image
            const container = document.createElement("div");
            container.style.cssText = `
              position: absolute;
              top: -9999px;
              left: -9999px;
              background: white;
              padding: 20px;
            `;

            // Create image element for PDF
            const pdfImg = document.createElement("img");
            pdfImg.src = dataUrl;
            pdfImg.style.cssText = `
              max-width: 100%;
              height: auto;
              display: block;
            `;

            container.appendChild(pdfImg);
            document.body.appendChild(container);

            // Determine page orientation based on image aspect ratio
            const aspectRatio = img.naturalWidth / img.naturalHeight;
            const orientation: "landscape" | "portrait" =
              aspectRatio > 1 ? "landscape" : "portrait";

            // Configure PDF options with default settings
            const options = {
              margin: 0.5,
              filename: "annotation.pdf",
              image: { type: "png" as const, quality: 0.95 },
              html2canvas: {
                scale: 1,
                useCORS: true,
                allowTaint: true,
              },
              jsPDF: {
                unit: "in" as const,
                format: "letter" as const,
                orientation: orientation as "portrait" | "landscape",
              },
            };

            // Generate PDF
            html2pdf()
              .set(options)
              .from(container)
              .save()
              .then(() => {
                // Cleanup
                document.body.removeChild(container);

                // Show success feedback
                const feedback = document.createElement("div");
                feedback.style.cssText = `
                  position: fixed;
                  top: 20px;
                  right: 20px;
                  background: #dc3545;
                  color: white;
                  padding: 12px 20px;
                  border-radius: 4px;
                  z-index: 10001;
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                `;
                feedback.textContent = "📄 PDF saved to downloads!";
                document.body.appendChild(feedback);

                setTimeout(() => {
                  if (document.body.contains(feedback)) {
                    document.body.removeChild(feedback);
                  }
                }, 3000);

                resolve();
              })
              .catch((error) => {
                document.body.removeChild(container);
                reject(error);
              });
          } catch (error) {
            reject(error);
          }
        };

        img.onerror = () => {
          reject(new Error("Failed to load image for PDF generation"));
        };

        img.src = dataUrl;
      });
    } catch (error) {
      console.error("PDF generation failed:", error);
      throw error;
    }
  };

  // Generate PDF from entire page HTML
  static generatePageToPdf = async (
    setIsCapturing?: (capturing: boolean) => void
  ): Promise<void> => {
    try {
      // Show spinner
      const spinner = AnnotationUtils.showSpinner();

      // Dynamic import to avoid SSR issues
      const html2pdf = await import("html2pdf.js").then(
        (mod) => mod.default || mod
      );

      // Configure PDF options with default settings for HTML page
      const options = {
        margin: 0.5,
        filename: "page.pdf",
        image: { type: "png" as const, quality: 0.95 },
        pagebreak: {
          mode: ["css", "legacy"],
          avoid: ["tr"],
        },
        html2canvas: {
          scale: 1.0,
          useCORS: true,
          allowTaint: true,
          ignoreElements: (element: Element) => {
            // Ignore spinner and other overlays
            return element.id === "annotation-spinner-overlay";
          },
        },
        jsPDF: {
          unit: "in" as const,
          format: "letter" as const,
          orientation: "landscape" as const, // Default to landscape for page content
        },
      };

      // Generate PDF from document body
      await html2pdf().set(options).from(document.body).save();

      // Show success feedback
      const feedback = document.createElement("div");
      feedback.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #dc3545;
        color: white;
        padding: 12px 20px;
        border-radius: 4px;
        z-index: 10001;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      `;
      feedback.textContent = "📄 Page saved as PDF!";
      document.body.appendChild(feedback);

      setTimeout(() => {
        if (document.body.contains(feedback)) {
          document.body.removeChild(feedback);
        }
      }, 3000);
    } catch (error) {
      console.error("Page PDF generation failed:", error);
      alert("Failed to generate PDF from page. Please try again.");
    } finally {
      // Hide spinner and reset state
      AnnotationUtils.hideSpinner();
      setIsCapturing?.(false);
    }
  };

  // Customize editor buttons after it renders
  static customizeEditorButtons = (editor: any): void => {
    // Wait for the editor to fully render in the shadow DOM
    setTimeout(() => {
      try {
        const shadowRoot = editor.shadowRoot;
        if (shadowRoot) {
          // Look for button with title="OK" or similar patterns
          const okButton =
            shadowRoot.querySelector('button[title="OK"]') ||
            shadowRoot.querySelector('button[title="Save"]') ||
            shadowRoot.querySelector('button[aria-label="OK"]') ||
            shadowRoot.querySelector(".mjs-toolbar button:last-child") ||
            shadowRoot.querySelector('mjsui-icon-button[title="OK"]');

          if (okButton) {
            // Replace the button content with "SAVE" text
            okButton.innerHTML = `
              <span style="
                font-weight: 600;
                font-size: 13px;
                color: white;
                text-shadow: 0 1px 1px rgba(0,0,0,0.2);
              ">Export</span>
            `;
            okButton.title = "Export annotated image";

            // Style the button to look better with text
            okButton.style.cssText += `
              min-width: 60px !important;
              padding: 8px 12px !important;
              background: #28a745 !important;
              border-radius: 4px !important;
              border: none !important;
            `;

            console.log("✅ Customized OK button to SAVE");
          } else {
            console.log("❌ Could not find OK button in shadow DOM");

            // Debug: Log all buttons to help identify the structure
            const buttons = shadowRoot.querySelectorAll("button");
            console.log(
              "Available buttons:",
              Array.from(buttons).map((btn) => ({
                title: (btn as HTMLElement).title,
                textContent: (btn as HTMLElement).textContent?.trim(),
                className: (btn as HTMLElement).className,
                tagName: (btn as HTMLElement).tagName,
              }))
            );
          }
        }
      } catch (error) {
        console.error("Failed to customize editor buttons:", error);
      }
    }, 500); // Wait for shadow DOM to fully render
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

            // Save handler with dialog
            editor.addEventListener("editorsave", async (event: any) => {
              const dataUrl = event.detail.dataUrl;
              if (dataUrl) {
                const choice = await AnnotationUtils.showSaveDialog(dataUrl);

                if (choice === "save") {
                  // Download to file
                  const link = document.createElement("a");
                  link.href = dataUrl;
                  link.download = "annotation.png";
                  link.click();
                } else if (choice === "copy") {
                  // Copy to clipboard
                  try {
                    const response = await fetch(dataUrl);
                    const blob = await response.blob();

                    await navigator.clipboard.write([
                      new ClipboardItem({
                        [blob.type]: blob,
                      }),
                    ]);

                    console.log("Image copied to clipboard!");

                    // Show brief success feedback
                    const feedback = document.createElement("div");
                    feedback.style.cssText = `
                      position: fixed;
                      top: 20px;
                      right: 20px;
                      background: #28a745;
                      color: white;
                      padding: 12px 20px;
                      border-radius: 4px;
                      z-index: 10001;
                      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    `;
                    feedback.textContent = "📋 Copied to clipboard!";
                    document.body.appendChild(feedback);

                    setTimeout(() => {
                      if (document.body.contains(feedback)) {
                        document.body.removeChild(feedback);
                      }
                    }, 3000);
                  } catch (error) {
                    console.error("Failed to copy to clipboard:", error);
                    alert(
                      "Failed to copy to clipboard. The image has been downloaded instead."
                    );

                    // Fallback to download
                    const link = document.createElement("a");
                    link.href = dataUrl;
                    link.download = "annotation.png";
                    link.click();
                  }
                }
                // If choice === 'cancel', do nothing
              }
            });

            // Add the editor to container
            container.appendChild(editor);

            // ✨ Customize the editor buttons
            AnnotationUtils.customizeEditorButtons(editor);

            // Scroll to top-left to show full page view initially
            container.scrollTop = 0;
            container.scrollLeft = 0;

            AnnotationUtils.hideSpinner();
            setIsCapturing?.(false);
          } catch (markerError) {
            console.error(
              "AnnotationEditor initialization failed:",
              markerError
            );
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
