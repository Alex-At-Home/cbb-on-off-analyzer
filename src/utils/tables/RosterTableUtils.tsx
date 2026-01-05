// React
import { ReactNode } from "react";

// Lodash
import _ from "lodash";

// Util imports
import { PositionUtils } from "../stats/PositionUtils";
import { GenericTableOps } from "../../components/GenericTable";
import { PlayerCode, IndivStatSet, RosterStatsByCode } from "../StatModels";
import styles from "./TableDisplayUtils.module.css";

/** Object marshalling logic for roster tables */
export class RosterTableUtils {
  /** Build a lookup map of the roster by their code, eg AaWiggins for "Wiggins, Aaron" (teamSeasonLookup only needed if includePosCat is true) */
  static buildRosterTableByCode(
    players: Array<any>,
    rosterInfo: Record<string, any> | undefined,
    includePosCat?: boolean,
    teamSeasonLookup?: string
  ): RosterStatsByCode {
    return _.chain(players)
      .map((p) => {
        const code =
          p.player_array?.hits?.hits?.[0]?._source?.player?.code || p.key;
        const rosterEntry = rosterInfo?.[code];
        // Ugly but we mutate p here:
        if (rosterEntry) p.roster = rosterEntry;

        //TODO: do I want this one, or the baseline or ???
        if (includePosCat) {
          const [posConfs, posConfsDiags] =
            PositionUtils.buildPositionConfidences(p, rosterEntry?.height_in);
          const [pos, posDiags] = PositionUtils.buildPosition(
            posConfs,
            posConfsDiags.confsNoHeight,
            p,
            teamSeasonLookup || ""
          );
          p.posClass = _.values(posConfs);
          p.role = pos;
        }

        return [code, p];
      })
      .fromPairs()
      .value();
  }

  /** Build a table row that sits between the header and the data and gives some colloquial help text */
  static buildInformationalSubheader(
    calcRapm: boolean,
    expandedView: boolean,
    darkMode: boolean
  ) {
    const brace = (color: string, widthPct: number = 100) => (
      <hr
        style={{
          height: "2px",
          width: `${widthPct}%`,
          borderWidth: "0",
          color: color,
          backgroundColor: color,
          marginBottom: "0px",
          paddingBottom: "0px",
          marginTop: "-10px",
          paddingTop: "0px",
          borderRadius: "5px",
        }}
      />
    );

    const braceText = (
      text: ReactNode,
      color: string,
      braceWidth: number = 100
    ) => (
      <div>
        <p style={{ color: color }}>
          <i>{text}</i>
        </p>
        {brace(color, braceWidth)}
      </div>
    );

    const whereIsAssistedPct = expandedView
      ? "bottom row is assisted%"
      : "tooltip shows assisted%";

    return [
      GenericTableOps.buildSubHeaderRow(
        [
          ["", 3],
          [
            braceText(
              "The higher 'Usg' (avg 20) the harder it is to keep ORtg high",
              darkMode ? "#5bc0de" : "blue"
            ),
            2,
          ],
          calcRapm
            ? [
                braceText(
                  <p style={{ width: "120%" }}>
                    2x {expandedView ? `O/D` : `Off`} Ratings as pts/100 above
                    D1 average (the 2 form a good range)
                  </p>,
                  darkMode ? "#e83e8c" : "purple",
                  75
                ),
                3,
              ]
            : [
                braceText(
                  <p style={{ width: "160%" }}>
                    {expandedView ? `O/D Ratings` : `Off Rating`} as pts/100
                    above D1 average
                  </p>,
                  darkMode ? "#e83e8c" : "purple"
                ),
                2,
              ],
          //TODO: his works weirdly .. colSpan wrong but text right on refresh...
          //(for now I've worked around it by not saving the state of "+ Info")
          ["", 1],
          [braceText("Ball-handling", darkMode ? "#df691a" : "brown"), 2],
          ["", expandedView ? 1 : 2], //(OR and DR are both on the top row if not expanded mode)
          [
            braceText(
              `Scoring signature (FTR is how often player is fouled shooting, ${whereIsAssistedPct})`,
              "teal"
            ),
            5,
          ],
          ["", 1],
          [braceText("Scoring quality", "green"), 4],
          ["", 1],
        ],
        `small ${styles.centerAlignCol} ${styles.bottomAlignCol}`
      ),
    ];
  }
}
