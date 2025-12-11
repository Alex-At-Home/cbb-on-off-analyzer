// React imports:
import React from "react";

// Additional components:
import ThemedSelect from "./ThemedSelect";

type Props = {
  yearOptions: string[];
  selectedYear: string;
  onYearChange: (newYear: string) => void;
  isDisabled?: boolean;
  styles?: any;
};

const YearSelector: React.FunctionComponent<Props> = ({
  yearOptions,
  selectedYear,
  onYearChange,
  isDisabled = false,
  styles = { menu: (base: any) => ({ ...base, zIndex: 2000 }) },
}) => {
  function stringToOption(s: string) {
    return { label: s, value: s };
  }

  return (
    <ThemedSelect
      isDisabled={isDisabled}
      styles={styles}
      value={stringToOption(selectedYear)}
      options={yearOptions.map((r) => stringToOption(r))}
      isSearchable={false}
      onChange={(option: any) => {
        if ((option as any)?.value) {
          const newYear = (option as any).value;
          onYearChange(newYear);
        }
      }}
    />
  );
};

export default YearSelector;
