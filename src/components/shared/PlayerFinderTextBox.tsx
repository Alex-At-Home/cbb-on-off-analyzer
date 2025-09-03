// React/Next imports:
import React, { useState, useEffect, useRef } from "react";
import Head from "next/head";

// Lodash:
import _ from "lodash";

// ES search
//@ts-ignore
import { ApiProxyConnector } from "@elastic/search-ui-elasticsearch-connector/api-proxy";
//@ts-ignore
import { SearchProvider, SearchBox } from "@elastic/react-search-ui";

import { DebouncedSearchBox } from "../../components/shared/DebouncedSearchBox";
import { ParamDefaults } from "../../utils/FilterModels";

type Props = {
  currGender?: string;
  playerCurrSelected: boolean;
  onSelectPlayer: (ncaaId: string, gender: string) => void;
};

const PlayerFinderTextBox: React.FunctionComponent<Props> = ({
  currGender,
  playerCurrSelected,
  onSelectPlayer,
}) => {
  const connector = new ApiProxyConnector({
    basePath: "/api",
  });
  return (
    <SearchProvider
      config={{
        apiConnector: connector,
        autocompleteQuery: {
          results: {
            resultsPerPage: 100,
            result_fields: {
              key: {},
              team: {},
              year: {},
              "roster.ncaa_id": {},
            },
            // override the default query
            search_fields: {
              key: {
                // Search UI will expand this into multi_match bool_prefix
                weight: 1,
              },
              conf: {
                weight: 0.2,
              },
              team: {
                weight: 0.2,
              },
            },
          },
        },
      }}
    >
      <DebouncedSearchBox minChars={3} debounceMs={300}>
        {(onChangeHandler, clearSelection) => (
          <SearchBox
            className="mb-2"
            inputProps={{
              placeholder: playerCurrSelected
                ? "Find another player..."
                : "Search for players...",
            }}
            autocompleteMinimumCharacters={3}
            autocompleteView={({ autocompletedResults, getItemProps }) => {
              // group by ncaa_id
              const grouped: Record<string, typeof autocompletedResults> = {};

              autocompletedResults.forEach((r) => {
                const esIndex = r._meta?.rawHit?._index;
                const gender = _.startsWith(esIndex, "hoopexp_women_")
                  ? "Women"
                  : "Men";
                if (
                  (!playerCurrSelected && !currGender) ||
                  gender == (currGender || ParamDefaults.defaultGender)
                ) {
                  const id = r.roster?.raw?.ncaa_id;
                  if (!id) return;
                  grouped[id] = grouped[id] || [];
                  grouped[id].push(r);
                }
              });

              return (
                <div className="sui-search-box__autocomplete-container">
                  {_.chain(grouped)
                    .values()
                    .sortBy((gs) => {
                      const maxVal =
                        _.maxBy(
                          gs,
                          (g: any) => (g._meta?.rawHit?._score || 1) as number
                        )?._meta?.rawHit?._score || 1;
                      return -(
                        maxVal *
                        (1 + (1 / 16) * Math.min(4, gs.length))
                      ); //(4 year player gets x1.25 bonus)
                    })
                    .map((group, i) => {
                      const result = group[0]; // pick first as representative
                      const teams = Array.from(
                        new Set(group.map((r) => r.team?.raw))
                      );
                      const years = group
                        .map((r) => r.year?.raw)
                        .filter(Boolean)
                        .map(Number);
                      const minYear = Math.min(...years);
                      const maxYear = Math.max(...years);
                      const yearStr =
                        minYear == maxYear ? minYear : `${minYear}-${maxYear}`;

                      return (
                        <div
                          {...getItemProps({
                            index: i,
                            key: result.id?.raw,
                            item: result,
                          })}
                          className="flex cursor-pointer p-2 hover:bg-gray-100"
                          onClick={() => {
                            clearSelection();
                            const esIndex = result._meta?.rawHit?._index;
                            const gender = _.startsWith(
                              esIndex,
                              "hoopexp_women_"
                            )
                              ? "Women"
                              : "Men";
                            onSelectPlayer(
                              result.roster?.raw?.ncaa_id || "",
                              gender
                            );
                          }}
                        >
                          {result.key?.raw} ({teams.join("; ")}) [{yearStr}]
                        </div>
                      );
                    })
                    .take(30)
                    .value()}
                </div>
              );
            }}
            autocompleteResults={{
              titleField: "key", // shows the player name
              urlField: "", // no link
              shouldTrackClickThrough: false,
            }}
          />
        )}
      </DebouncedSearchBox>
    </SearchProvider>
  );
};

export default PlayerFinderTextBox;
