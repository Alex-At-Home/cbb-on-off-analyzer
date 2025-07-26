// React imports:
import React, { useState } from "react";
import { UrlRouting } from "../../utils/UrlRouting";

const LandingPageIcon: React.FunctionComponent<{}> = () => {
  return (
    <a
      href={UrlRouting.getLandingPageUrl({})}
      className="float-left"
      style={{ position: "relative", top: "2px" }}
    >
      <img src="images/Large_Banner.jpg" />
    </a>
  );
};

export default LandingPageIcon;
