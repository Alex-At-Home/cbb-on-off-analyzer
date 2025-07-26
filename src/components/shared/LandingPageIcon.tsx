// React imports:
import React, { useState, useEffect } from "react";
import { UrlRouting } from "../../utils/UrlRouting";

const LandingPageIcon: React.FunctionComponent<{}> = () => {
  const [darkMode, setDarkMode] = useState(
    _.thru(undefined, (__) => {
      // We can also use JavaScript to generate the detection element.
      const detectionDiv = document.createElement("div");
      detectionDiv.style.display = "none";
      detectionDiv.style.backgroundColor = "canvas";
      detectionDiv.style.colorScheme = "light";
      document.body.appendChild(detectionDiv);
      // If the computed style is not white then the page is in Auto Dark Theme.
      const isAutoDark =
        getComputedStyle(detectionDiv).backgroundColor != "rgb(255, 255, 255)";

      // remove the detection element from the DOM.
      document.body.removeChild(detectionDiv);
      return isAutoDark;
    })
  );
  return (
    <a
      href={UrlRouting.getLandingPageUrl({})}
      className="float-left"
      style={{ position: "relative", top: "2px" }}
    >
      <img
        src={
          darkMode
            ? "images/Large_Banner_invert.jpg"
            : "images/Large_Banner.jpg"
        }
      />
    </a>
  );
};

export default LandingPageIcon;
