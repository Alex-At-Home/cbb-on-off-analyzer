import React, { useMemo } from "react";
import { WithSearch } from "@elastic/react-search-ui";
import debounce from "lodash/debounce";

interface DebouncedSearchBoxProps {
  children: (
    onChangeHandler: (e: React.ChangeEvent<HTMLInputElement>) => void
  ) => React.ReactNode;
  minChars?: number;
  debounceMs?: number;
}

export const DebouncedSearchBox: React.FC<DebouncedSearchBoxProps> = ({
  children,
  minChars = 3,
  debounceMs = 300,
}) => {
  return (
    <WithSearch mapContextToProps={({ setSearchTerm }) => ({ setSearchTerm })}>
      {({ setSearchTerm }) => {
        // create a debounced function once
        const debouncedSetTerm = useMemo(
          () =>
            debounce((term: string) => {
              if (setSearchTerm) setSearchTerm(term);
            }, debounceMs),
          [setSearchTerm, debounceMs]
        );

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          const val = e.target.value;
          if (val.length >= minChars) {
            debouncedSetTerm(val);
          } else {
            // clear search term if below minChars
            if (setSearchTerm) setSearchTerm("");
          }
        };

        return <>{children(handleChange)}</>;
      }}
    </WithSearch>
  );
};
