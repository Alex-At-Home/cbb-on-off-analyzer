// React imports:
import React, { useState, useEffect, useRef } from "react";
import { UrlRouting } from "../../utils/UrlRouting";
import { useTheme } from "next-themes";

const LandingPageIcon: React.FunctionComponent<{}> = () => {
  const [isAutoDarkMode, setIsAutoDarkMode] = useState(0);
  const testElementRef = useRef(null);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (testElementRef.current) {
      // Create a temporary element with specific styles to check for auto dark theme
      const testElement = document.createElement("div");
      testElement.style.backgroundColor = "canvas";
      testElement.style.colorScheme = "light";
      testElement.style.position = "absolute";
      testElement.style.top = "-9999px";
      testElement.style.left = "-9999px";
      document.body.appendChild(testElement);

      // Check the computed background color
      const computedStyle = window.getComputedStyle(testElement);
      const backgroundColor = computedStyle.backgroundColor;

      // If the background color is not white (rgb(255, 255, 255)),
      // it indicates that Chrome's Auto Dark Theme is applied.
      if (backgroundColor !== "rgb(255, 255, 255)") {
        setIsAutoDarkMode(-1);
      } else {
        if (theme == "light") {
          setIsAutoDarkMode(1);
        } else {
          setIsAutoDarkMode(-1);
        }
      }
      // Clean up the temporary element
      document.body.removeChild(testElement);
    }
  }, []);

  return isAutoDarkMode == 0 ? (
    <div ref={testElementRef} style={{ display: "none" }}></div>
  ) : (
    <a
      href={UrlRouting.getLandingPageUrl({})}
      className="float-left"
      style={{ position: "relative", top: "2px" }}
    >
      <img
        className="d-md-none pr-2"
        src={
          isAutoDarkMode < 0
            ? "images/favicon-32x32_invert.png"
            : "images/favicon-32x32.png"
        }
      />
      <img
        className="d-none d-md-flex"
        src={
          isAutoDarkMode < 0
            ? "images/Large_Banner_invert_trans.jpg"
            : "images/Large_Banner_trans.jpg"
        }
      />
    </a>
  );
};

export default LandingPageIcon;
