import React, { useState, useEffect } from "react";

import Form from "react-bootstrap/Form";

type Props = {
  startingVal?: string;
  validate?: (t: string) => boolean;
  onChange: (t: string) => void;
  timeout: number;
  placeholder?: string;
  allowExternalChange?: boolean; //(default(false), changing validate won't effect it, retained for legacy reasons - maybe make this forced later)
  // Extra fields to pass in:
  className?: string;
  size?: "sm" | "lg";
};

/** More responsive form control - must set if validate is set then startingVal is locked else just starting */
const AsyncFormControl: React.FunctionComponent<Props> = ({
  startingVal,
  validate,
  timeout,
  onChange,
  placeholder,
  allowExternalChange,
  ...props
}) => {
  //  var timeoutId = -1;
  const [timeoutId, setTimeoutId] = useState(-1);

  const [internalVal, setInternalVal] = useState(startingVal || "");
  useEffect(() => {
    if (internalVal != startingVal && timeoutId == -1) {
      setInternalVal(startingVal || "");
    }
  }, [startingVal]);

  /** Handling filter change (/key presses to fix the select/delete on page load) */
  const internalOnChange = (ev: any) => {
    const toSet = ev.target.value;
    if (timeoutId != -1) {
      window.clearTimeout(timeoutId);
    }
    setTimeoutId(
      window.setTimeout(() => {
        onChange(toSet);
        setTimeoutId(-1);
      }, timeout)
    );
  };
  /** Only allow validated characters */
  const internalValidateAndChange = (ev: any) => {
    const newVal = ev.target.value;
    if (!validate || validate(newVal)) {
      internalOnChange(ev);
      setInternalVal(newVal);
    }
  };

  return validate || allowExternalChange ? (
    <Form.Control
      onKeyUp={internalValidateAndChange}
      onChange={internalValidateAndChange}
      value={internalVal}
      placeholder={placeholder}
      {...props}
    />
  ) : (
    <Form.Control
      onKeyUp={internalOnChange}
      onChange={internalOnChange}
      placeholder={placeholder}
      defaultValue={internalVal}
      {...props}
    />
  );
};
export default AsyncFormControl;
