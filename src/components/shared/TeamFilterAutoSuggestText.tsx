// React imports:
import React, {
  useState,
  useEffect,
  createRef,
  ChangeEventHandler,
} from "react";

// Lodash
import _ from "lodash";

// Library imports:

// Additional components:
import TextAreaAutocomplete from "./TextAreaAutocomplete";

/** The keydown event does not come from AutoSuggestText element */
export const notFromFilterAutoSuggest = (event: any) => {
  return event?.srcElement?.className?.indexOf("auto-suggest") < 0;
};

type Props = {
  readOnly: boolean;
  placeholder: string;
  value: string;
  autocomplete: string[];
  onChange: (ev: any) => void;
  onSelectionChanged: (newStr: string) => void;
  onKeyUp: (ev: any) => void;
  onKeyDown?: (ev: any) => void;
};
const TeamFilterAutoSuggestText: React.FunctionComponent<Props> = ({
  readOnly,
  placeholder,
  value,
  autocomplete,
  onChange,
  onSelectionChanged,
  onKeyUp,
  onKeyDown,
}) => {
  const [currText, setCurrText] = useState(value);
  const [lastSelectedText, setLastSelectedText] = useState(value);

  useEffect(() => {
    if (value != currText) {
      setCurrText(value);
    }
  }, [value]);

  // Data model

  const isDebug = process.env.NODE_ENV !== "production";

  const textRef = createRef<HTMLTextAreaElement>();

  // View

  return (
    <TextAreaAutocomplete
      ref={textRef}
      Component={"textarea"}
      style={{ minHeight: "2.4rem", height: "2.4rem" }}
      value={currText}
      readOnly={readOnly}
      className="form-control auto-suggest"
      placeholder={placeholder}
      requestOnlyIfNoOptions={true} //(only requests if empty)
      options={autocomplete}
      trigger="" //(special case which causes problems to the underlying lib i've worked around)
      regex='^[A-Za-z0-9\\_.,()"-]+$'
      matchAny={true}
      maxOptions={18}
      spaceRemovers={[";"]}
      passThroughEnter={false}
      passThroughTab={false}
      onChange={
        ((eventText: string) => {
          setCurrText(eventText);
          onChange({ target: { value: eventText } });
        }) as ((value: string) => void) &
          ChangeEventHandler<HTMLTextAreaElement>
      }
      onSelect={(eventText: string) => {
        setLastSelectedText(eventText);
        onSelectionChanged(eventText);
      }}
      onKeyUp={onKeyUp}
      onKeyDown={(ev: any) => {
        if (ev.keyCode == 13 || ev.keyCode == 9) {
          //(never pass up regardless)
          ev.preventDefault();
          if (lastSelectedText != currText) {
            // Use to update selection
            setLastSelectedText(currText);
            onSelectionChanged(currText);
          }
        } else if (onKeyDown) {
          //(doesn't work for enter/return because of the CommonFilter-specific handler)
          onKeyDown(ev);
        }
      }}
    />
  );
};
export default TeamFilterAutoSuggestText;
