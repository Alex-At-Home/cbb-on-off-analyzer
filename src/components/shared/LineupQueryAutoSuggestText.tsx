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
import fetch from "isomorphic-unfetch";
import Badge from "react-bootstrap/Badge";

// Additional components:
import TextAreaAutocomplete from "./TextAreaAutocomplete";

// Utils:
import {
  ParamPrefixes,
  ParamDefaults,
  GameFilterParams,
} from "../../utils/FilterModels";
import { dataLastUpdated } from "../../utils/internal-data/dataLastUpdated";
import { ClientRequestCache } from "../../utils/ClientRequestCache";
import { GameSelection, QueryUtils } from "../../utils/QueryUtils";

/** The keydown event does not come from AutoSuggestText element */
export const notFromAutoSuggest = (event: any) => {
  return event?.srcElement?.className?.indexOf("auto-suggest") < 0;
};

type Props = {
  readOnly: boolean;
  placeholder: string;
  initValue: string;
  team?: string;
  gender?: string;
  year?: string;
  games?: GameSelection[];
  onChange: (ev: any) => void;
  onKeyUp: (ev: any) => void;
  onKeyDown: (ev: any) => void;
};
const LineupQueryAutoSuggestText: React.FunctionComponent<Props> = ({
  readOnly,
  placeholder,
  initValue,
  team,
  year,
  gender,
  games,
  onChange,
  onKeyUp,
  onKeyDown,
}) => {
  // Data model

  const [savedParams, setSavedParams] = useState({} as GameFilterParams);
  const [basicOptions, setBasicOptions] = useState([] as Array<string>);
  const [advOptions, setAdvOptions] = useState([] as Array<string>);

  const isDebug = process.env.NODE_ENV !== "production";

  const basicOperators = ["AND", "OR", "NOT"];
  const advancedFields = basicOperators.concat([
    "players.id:",
    "players.code:",
    "opponent.team:",
    "start_min:",
    "end_min:",
    "location_type:",
    "location_type:Home",
    "location_type:Away",
    "location_type:Neutral",
    "date:",
    "players_in.id:",
    "players_out.id:",
    "score_info.start_diff:",
    "score_info.end_diff:",
    "in_conf:true",
    "in_conf:false",
    "vs_high_major:true",
    "vs_high_major:false",
    "vs_rank:",
    "vs_adj_off:",
    "vs_adj_def:",
    "vs_3p:",
    "ROSTER_TOP_8",
    "ROSTER_TOP_7",
    "ROSTER_TOP_6",
    "ROSTER_TOP_5",
    "ROSTER_TOP_4",
    "ROSTER_TOP_3",
    "ROSTER_TOP_2",
  ]);

  const textRef = createRef<HTMLTextAreaElement>();

  // Utils

  /** Reset everything if team/year/gender changes */
  useEffect(() => {
    const params: GameFilterParams = { year: year, gender: gender, team: team };
    if (!_.isEqual(params, savedParams)) {
      if (isDebug)
        console.log(
          `[auto-debug-mode] Update params: old=[${JSON.stringify(
            savedParams
          )}] vs new=[${JSON.stringify(params)}]`
        );
      setSavedParams(params);
      setBasicOptions([]);
      setAdvOptions([]);
      fetchRoster();
    }
  });

  /** Makes an API call to elasticsearch to get the roster */
  const fetchRoster = () => {
    if (gender && year && team) {
      const genderYear = `${gender}_${year}`;
      const currentJsonEpoch = dataLastUpdated[genderYear] || -1;

      const query: GameFilterParams = {
        gender: gender,
        year: year,
        team: team,
        baseQuery: "",
        onQuery: "",
        offQuery: "",
        minRank: ParamDefaults.defaultMinRank,
        maxRank: ParamDefaults.defaultMaxRank,
      };
      const paramStr = QueryUtils.stringify(query);
      // Check if it's in the cache:
      const cachedJson = ClientRequestCache.decacheResponse(
        paramStr,
        ParamPrefixes.roster,
        currentJsonEpoch,
        false /* This gets called every keypress, so even in debug mode it's a huge pain */
      );
      if (cachedJson && !_.isEmpty(cachedJson)) {
        //(ignore placeholders here)
        handleResponse(cachedJson);
      } else {
        fetch(`/api/getRoster?${paramStr}`).then(function (
          response: fetch.IsomorphicResponse
        ) {
          response.json().then(function (json: any) {
            // Cache result locally:
            if (isDebug) {
              console.log(
                `[auto-debug-mode] CACHE_KEY=[${ParamPrefixes.roster}${paramStr}]`
              );
              //(this is a bit chatty)
              //console.log(`CACHE_VAL=[${JSON.stringify(json)}]`);
            }
            if (response.ok) {
              //(never cache errors)
              ClientRequestCache.cacheResponse(
                paramStr,
                ParamPrefixes.roster,
                json,
                currentJsonEpoch,
                isDebug
              );
            }
            handleResponse(json);
          });
        });
      }
    }
  };

  /** Parse the return from fetch Roster into name fragments */
  const handleResponse = (json: any) => {
    const jsons = json?.responses || [];
    const rosterCompareJson = jsons.length > 0 ? jsons[0] : {};
    const roster =
      rosterCompareJson?.aggregations?.tri_filter?.buckets?.baseline?.player
        ?.buckets || [];

    const nameFrags = _.chain(roster)
      .flatMap((rosterObj) => {
        const nameFragments = _.split(rosterObj.key, /\s*,\s*|\s+/);
        return _.chain(nameFragments)
          .filter((s) => s.length >= 2)
          .value();
      })
      .sortBy()
      .sortedUniq()
      .value();

    const names = _.chain(roster)
      .map((rosterObj) => `"${rosterObj.key}"`)
      .sortBy()
      .sortedUniq()
      .value();

    const namesAndFrags = nameFrags.concat(names); //(get the order to work well in practice)

    setBasicOptions(namesAndFrags.concat(basicOperators));
    setAdvOptions(namesAndFrags.concat(advancedFields));
  };

  // View

  return (
    <TextAreaAutocomplete
      ref={textRef}
      Component={"textarea"}
      style={_.omit(
        {
          minHeight: "2.4rem",
          height: "2.4rem", //(if textbox is read-only then don't allow it to grow)
        },
        readOnly ? [] : ["height"]
      )}
      defaultValue={initValue}
      readOnly={readOnly}
      className="form-control auto-suggest"
      placeholder={placeholder}
      requestOnlyIfNoOptions={true} //(only requests if empty)
      options={
        //  Used to be predicated on [] but now we always support the advanced options
        //(initValue && ('[' == initValue[0])) ? advOptions : basicOptions
        advOptions.concat(
          _.isEmpty(games)
            ? ["opponent.Home:", "opponent.Away:", "opponent.Neutral:"]
            : (games || []).map(
                (game) => `opponent.${game.location}:"${game.opponent}"`
              )
        )
      }
      richTextReplacements={{
        ..._.chain(basicOptions)
          .map((s) => [
            s,
            {
              renderTo: (
                <Badge variant="secondary">
                  <div style={{ fontSize: "0.95rem" }}>{s}</div>
                </Badge>
              ),
            },
          ])
          .fromPairs()
          .value(),
        ..._.chain(advancedFields)
          .map((s) => [
            s,
            {
              renderTo: (
                <Badge variant="info">
                  <div style={{ fontSize: "0.85rem" }}>{s}</div>
                </Badge>
              ),
            },
          ])
          .fromPairs()
          .value(),
        ..._.chain(games || [])
          .map((g) => [
            `opponent.${g.location}:"${g.opponent}"`,
            {
              renderTo: (
                <span>
                  <Badge variant="info">
                    <div style={{ fontSize: "0.85rem" }}>
                      opponent.{g.location}:
                    </div>
                  </Badge>
                  <Badge variant="success">
                    <div style={{ fontSize: "0.85rem" }}>"{g.opponent}"</div>
                  </Badge>
                </span>
              ),
            },
          ])
          .fromPairs()
          .value(),
        ..._.chain(games || [])
          .map((g) => [
            `opponent.team:"${g.opponent}"`,
            {
              renderTo: (
                <span>
                  <Badge variant="info">
                    <div style={{ fontSize: "0.85rem" }}>opponent.team:</div>
                  </Badge>
                  <Badge variant="success">
                    <div style={{ fontSize: "0.85rem" }}>"{g.opponent}"</div>
                  </Badge>
                </span>
              ),
            },
          ])
          .fromPairs()
          .value(),
        OR: {
          renderTo: (
            <Badge pill variant="primary">
              OR
            </Badge>
          ),
        },
        AND: { renderTo: <Badge variant="primary">AND</Badge> },
        NOT: { renderTo: <Badge variant="danger">NOT</Badge> },
      }}
      onRequestOptions={fetchRoster}
      trigger=""
      regex='^[A-Za-z0-9\\_.,":-]+$'
      matchAny={true}
      maxOptions={18}
      spaceRemovers={[";", ")", "]", " ", "}"]}
      passThroughEnter={true}
      passThroughTab={false}
      onChange={
        ((eventText: string) => {
          onChange({ target: { value: eventText } });
        }) as ((value: string) => void) &
          ChangeEventHandler<HTMLTextAreaElement>
      }
      onBlur={(ev: any) => {
        const currentTextRef = textRef.current as any;
        setTimeout(() => {
          //(give out of order events a chance!)
          try {
            currentTextRef.resetHelper();
          } catch (err: unknown) {}
        }, 100);
      }}
      onKeyUp={onKeyUp}
      onKeyDown={onKeyDown}
    />
  );
};
export default LineupQueryAutoSuggestText;
