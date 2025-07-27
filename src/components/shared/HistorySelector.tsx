// React imports:
import React, { useState, useEffect } from "react";
import Router from "next/router";

// Additional components:
// @ts-ignore
import Select, { components } from "react-select";

// Utils:
import { QueryUtils } from "../../utils/QueryUtils";
import { UrlRouting } from "../../utils/UrlRouting";
import { HistoryManager } from "../../utils/HistoryManager";
import {
  ParamPrefixes,
  GameFilterParams,
  LineupFilterParams,
  TeamReportFilterParams,
} from "../../utils/FilterModels";
import ThemedSelect from "./ThemedSelect";

/** Popovers appear to need to know their children's width, if it's "complex" */
export const historySelectContainerWidth = "600px";

type Props = {
  tablePrefix: string;
};
const HistorySelector: React.FunctionComponent<Props> = ({ tablePrefix }) => {
  const allParams =
    typeof window === `undefined` //(ensures SSR code still compiles)
      ? ""
      : window.location.search;

  /** For use in selects */
  function stringToOption(
    s: string,
    val: [string, GameFilterParams | LineupFilterParams]
  ) {
    return { label: s, value: JSON.stringify(val) };
  }
  function getPlaceholder() {
    return { label: "Select analysis from history..." };
  }

  return (
    <div style={{ width: "500px" }}>
      <ThemedSelect
        styles={{ menu: (base: any) => ({ ...base, zIndex: 1000 }) }}
        value={getPlaceholder()}
        menuIsOpen={true}
        options={HistoryManager.getHistory().map((r) =>
          stringToOption(HistoryManager.filterSummary(r[0], r[1]), r)
        )}
        onChange={(option: any) => {
          const valJson = JSON.parse((option as any)?.value || "{}"); // [string, GameFilterParams | LineupFilterParams]

          const getUrl = () => {
            if (valJson[0] == ParamPrefixes.game) {
              return UrlRouting.getGameUrl(valJson[1] as GameFilterParams, {});
            } else if (valJson[0] == ParamPrefixes.lineup) {
              return UrlRouting.getLineupUrl(
                valJson[1] as LineupFilterParams,
                {}
              );
            } else if (valJson[0] == ParamPrefixes.report) {
              return UrlRouting.getTeamReportUrl(
                valJson[1] as TeamReportFilterParams
              );
            } else {
              return undefined;
            }
          };
          const newUrl = getUrl();
          if (newUrl) {
            if (tablePrefix == valJson[0]) {
              // (can't force a full client refresh using Router - this is an ugly alternative)
              window.location.href = newUrl;
            } else {
              Router.push(newUrl);
            }
          } else {
            //(else do nothing)
            console.log(
              `[WARNING] unexpected history selection: ${JSON.stringify(
                option
              )}`
            );
          }
        }}
      />
    </div>
  );
};
export default HistorySelector;
