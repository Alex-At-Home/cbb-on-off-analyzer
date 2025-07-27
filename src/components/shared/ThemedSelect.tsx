// React imports:
import React, { useState } from "react";

//@ts-ignore
import Select, { components } from "react-select";

const ThemedSelect: React.FunctionComponent<any> = (props: any) => {
  return (
    <Select
      {...props}
      className={`${props.className || ""} hoop-explorer-select-container`}
      classNamePrefix="hoop-explorer-select"
    />
  );
};
export default ThemedSelect;
