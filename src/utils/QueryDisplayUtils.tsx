import _ from "lodash";

import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

import {
  QueryUtils,
  CommonFilterType,
  isCommonFilterCustomDate,
  isCommonFilterGameSelector,
} from "./QueryUtils";
import { format } from "date-fns";

import { efficiencyAverages } from "./public-data/efficiencyAverages";

/** For shared display logic between the different filter types for displaying query info */
export class QueryDisplayUtils {
  /** Display the badge corresponding to the filter type */
  public static showQueryFilter = (
    t: CommonFilterType,
    gender: string,
    year: string,
    inverted: boolean = false
  ) => {
    const genderYear = `${gender}_${year}`;
    const avgEff =
      efficiencyAverages[genderYear] || efficiencyAverages.fallback!;
    const deltaEff = gender == "Women" ? 6 : 4.5;

    const maybeInvert = (s: string) => {
      if (inverted) {
        return s == "Not-Home" ? "Home" : `NOT ${s}`;
      } else return s;
    };
    const toolTip = () => {
      switch (t) {
        case "Conf":
          return (
            <Tooltip id={`qf${t}`}>
              Conference games only. Use <b>in_conf:true</b> directly in query
              fields(s).
            </Tooltip>
          );
        case "Home":
          return (
            <Tooltip id={`qf${t}`}>
              Home games only. Use <b>location_type:Home</b> or{" "}
              <b>opponent.Home:*</b> directly in query fields(s).
            </Tooltip>
          );
        case "Away":
          return (
            <Tooltip id={`qf${t}`}>
              Away games only. Use <b>location_type:Away</b> or{" "}
              <b>opponent.Away:*</b> directly in query fields(s).
            </Tooltip>
          );
        case "Not-Home":
          return (
            <Tooltip id={`qf${t}`}>
              Away/Neutral games only. Use <b>location_type:(Away Neutral)</b>{" "}
              or <b>(opponent.Away:* opponent.Neutral:*)</b> directly in query
              fields(s).
            </Tooltip>
          );
        case "1st-Half":
          return (
            <Tooltip id={`qf${t}`}>
              First Half only. Use <b>end_min:{"<="}20</b> directly in query
              fields(s).
            </Tooltip>
          );
        case "2nd-Half":
          return (
            <Tooltip id={`qf${t}`}>
              Second half and OT. Use <b>end_min:{">"}20</b> directly in query
              fields(s).
            </Tooltip>
          );
        case "Stretch":
          return (
            <Tooltip id={`qf${t}`}>
              Last 8 minutes and OT. Use <b>end_min:{">="}32</b> directly in
              query fields(s).
            </Tooltip>
          );

        case "Vs-Good":
          return (
            <Tooltip id={`qf${t}`}>
              Playing against T80 teams. Use <b>vs_rank:{`<`}=80</b> directly in
              query fields(s).
            </Tooltip>
          );
        case "Good-Off":
          return (
            <Tooltip id={`qf${t}`}>
              Playing against teams with good (T80-100ish) offense. Use{" "}
              <b>
                vs_adj_off:{`>`}
                {(avgEff + deltaEff).toFixed(1)}
              </b>{" "}
              directly in query fields(s).
            </Tooltip>
          );
        case "Good-Def":
          return (
            <Tooltip id={`qf${t}`}>
              Playing against teams with good (T80-100ish) defense. Use{" "}
              <b>
                vs_adj_def:{`<`}
                {(avgEff - deltaEff).toFixed(1)}
              </b>{" "}
              directly in query fields(s).
            </Tooltip>
          );

        case "Nov-Dec":
          return (
            <Tooltip id={`qf${t}`}>
              Nov/Dec games only. Use eg{" "}
              <b>date:[* TO {_.take(year, 4)}-12-31]</b> directly in query
              fields(s).
            </Tooltip>
          );
        case "Jan-Apr":
          return (
            <Tooltip id={`qf${t}`}>
              Jan-Apr games only. Use eg{" "}
              <b>
                date:{`{`}
                {_.take(year, 4)}-12-31 TO *]
              </b>{" "}
              directly in query fields(s).
            </Tooltip>
          );
        case "Last-30d":
          return (
            <Tooltip id={`qf${t}`}>
              Games in the last 30 days (from now/end-of-season). Use{" "}
              <b>date:[yyyy-mm-dd TO yyyy-mm-dd]</b> directly in query fields(s)
              for different date queries.
            </Tooltip>
          );
        default: // all the object types, currently just CommonFilterCustomDate/CommonFilterGameSelector
          if (isCommonFilterCustomDate(t)) {
            return (
              <Tooltip id={`qf${QueryUtils.asString(t)}`}>
                Games in this data range. Use{" "}
                <b>
                  date:[{format(t.start, "yyyy-MM-dd")} TO{" "}
                  {format(t.end, "yyyy-MM-dd")}]
                </b>{" "}
                directly in query fields(s).
              </Tooltip>
            );
          } else if (isCommonFilterGameSelector(t)) {
            return (
              <Tooltip id={`qf${QueryUtils.asString(t)}`}>
                Only the following games: [
                {t.gameIds
                  .map((g) =>
                    g
                      .replaceAll(":H:", " ")
                      .replaceAll(":A:", " @ ")
                      .replaceAll(":N:", " vs ")
                  )
                  .join(", ")}
                ]. Games selected in the game selector.
                <br />
                <br />
                Use eg <b>opponent.Home|Away|Neutral:"OPPONENT_NAME"</b>{" "}
                directly in query fields(s).
              </Tooltip>
            );
          } else {
            return (
              <Tooltip id={`qf${QueryUtils.asString(t)}`}>
                (Unknown filter type)
              </Tooltip>
            );
          }
      }
    };
    return (
      <OverlayTrigger placement="auto" overlay={toolTip()}>
        <span className="badge badge-pill badge-secondary">
          {maybeInvert(QueryUtils.asString(t, true))}
        </span>
      </OverlayTrigger>
    );
  };

  /** Handles  */
  public static showInvertedQueryAndFilters(
    baseQuery?: string,
    baseFilters?: string
  ) {
    const tooltip = (
      <Tooltip id={`invertedBase`}>
        Inverted query generated via "auto-off" in On/Off pages - see there for
        more details
      </Tooltip>
    );
    return (
      <OverlayTrigger placement="auto" overlay={tooltip}>
        <span className="badge badge-pill badge-secondary">
          QUERY:({baseQuery || ""}) OR FILTERS:({baseFilters || ""})
        </span>
      </OverlayTrigger>
    );
  }
}
