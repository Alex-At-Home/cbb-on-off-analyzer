// React imports:
import React from "react";

// Lodash:
import _ from "lodash";

// Additional components:
import ThemedSelect from "./ThemedSelect";

export class YearSelectorConstants {
  static readonly multiName = "Multi";
}

type Props = {
  yearOptions: string[];
  selectedYear: string;
  onYearChange: (newYear: string) => void;
  allowMultiYear?: boolean;
  isDisabled?: boolean;
  styles?: any;
};

const YearSelector: React.FunctionComponent<Props> = ({
  yearOptions,
  selectedYear: selectedYearIn,
  onYearChange,
  allowMultiYear = false,
  isDisabled = false,
  styles = { menu: (base: any) => ({ ...base, zIndex: 2000 }) },
}) => {
  // Handle multi-year parsing
  const yearArray = selectedYearIn.split(":");
  const selectedYear =
    yearArray.length == 2 && yearArray[0] === YearSelectorConstants.multiName
      ? `${selectedYearIn},${YearSelectorConstants.multiName}` // Add Multi to the end for consistency
      : selectedYearIn;

  function stringToOption(s: string) {
    return { label: s, value: s };
  }

  function shortenYearForDisplay(year: string): string {
    // Convert "2025/26" to "25/26", leave other formats unchanged
    if (year.match(/^20\d{2}\/\d{2}$/)) {
      return year.substring(2); // Remove "20" prefix
    }
    return year;
  }

  function stringToOptionWithShortYear(s: string) {
    return { label: shortenYearForDisplay(s), value: s };
  }

  const isMultiYears =
    selectedYear.indexOf(YearSelectorConstants.multiName) >= 0;

  function getCurrentYearsOrPlaceholder() {
    if (selectedYear === "") {
      return { label: yearOptions[0] || "" }; // Default to first year option
    }

    if (isMultiYears) {
      // Parse "Multi:year1,year2" format
      const parts = selectedYearIn.split(":");
      if (parts.length === 2 && parts[0] === YearSelectorConstants.multiName) {
        const years = parts[1].split(",").filter((y) => y !== "");
        return years.map(stringToOptionWithShortYear); // Use shortened display for badges
      }
      // Fallback for comma-separated format with Multi at end
      return selectedYear.split(",").filter(y => y !== YearSelectorConstants.multiName).map(stringToOptionWithShortYear);
    }

    return stringToOption(selectedYear); // Keep full year for single mode
  }

  const allYearOptions = allowMultiYear
    ? [YearSelectorConstants.multiName].concat(yearOptions)
    : yearOptions;

  return (
    <ThemedSelect
      isDisabled={isDisabled}
      styles={styles}
      isMulti={isMultiYears}
      value={getCurrentYearsOrPlaceholder()}
      options={allYearOptions.map((r) => stringToOption(r))}
      isSearchable={false}
      onChange={(optionsIn: any) => {
        const options = (isMultiYears ? optionsIn : [optionsIn]) as Array<any>;
        const selection = (options || []).map(
          (option) => (option as any)?.value || ""
        );

        // Check if we're still in multi-year mode - either we currently are in multi mode,
        // or user selected "Multi" from the dropdown
        const userSelectedMulti = _.some(
          selection,
          (sel) => sel === YearSelectorConstants.multiName
        );
        const isStillMultiYear = isMultiYears || userSelectedMulti;

        const finalSelection = selection.filter((t: string) => t !== "");

          if (isStillMultiYear) {
            // Multi-year mode
            const yearsList = finalSelection.filter(
              (y) => y !== YearSelectorConstants.multiName
            );

            // If entering multi mode and no years selected, add current year
            if (yearsList.length === 0 && !isMultiYears && userSelectedMulti) {
              yearsList.push(selectedYearIn);
            }

            // If no years left, exit multi-year mode
            if (yearsList.length === 0) {
              onYearChange(yearOptions[0] || "");
            } else {
              // Stay in multi-year mode even with just one year
              const newYearStr = `${
                YearSelectorConstants.multiName
              }:${yearsList.join(",")}`;
              onYearChange(newYearStr);
            }
          } else {
            // Single year mode
            const newYear = _.take(finalSelection, 1)[0] || yearOptions[0] || "";
            onYearChange(newYear);
          }
      }}
    />
  );
};

export default YearSelector;
