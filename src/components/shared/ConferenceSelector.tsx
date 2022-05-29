// React imports:
import React, { useState, useEffect } from 'react';
import Router from 'next/router';

import _ from "lodash";

// Bootstrap imports:
import 'bootstrap/dist/css/bootstrap.min.css';

// Additional components:
import Select, { components, createFilter} from "react-select"
import { ConferenceToNickname, NicknameToConference, Power6ConferencesNicks } from '../../utils/public-data/ConferenceInfo';

export class ConfSelectorConstants {
   static readonly highMajorConfsName = "Power 6 Conferences";
   static readonly nonHighMajorConfsName = "Outside The P6";
   static readonly queryFiltersName = "Manual Filter";
   static readonly multiName = "Multi";
   static readonly powerSixConfsStr = Power6ConferencesNicks.join(",");   
};

type Props = {
   emptyLabel: string,
   confStr: string,
   tier?: string, //(if populated then tier mode)
   confMap?: Map<string, string[]>,
   confs?: Array<string>,
   onChangeConf: (newConfOrTier: string) => void
};
const ConferenceSelector: React.FunctionComponent<Props> = ({emptyLabel, confStr: confStrIn, tier, confMap, confs, onChangeConf}) => {

   const confArray = confStrIn.split(",");
   const confStr = ((confArray.length == 1) || (confStrIn.indexOf(ConfSelectorConstants.multiName) >= 0))
      ? confStrIn : `${confStrIn},${ConfSelectorConstants.multiName}`; //(bwc)

   function stringToOption(s: string) {
      return { label: s, value: s };
   }
   const isMultiConfs = confStr.indexOf(ConfSelectorConstants.multiName) >= 0;

   const confsWithTeams = confMap ?
      _.toPairs(confMap || {}).map(kv => {
      const teams = kv[1] || [];
      return _.isEmpty(teams) ? kv[0] : `${kv[0]} [${teams.join(", ")}]`;
      }) : (confs || []);

   function getCurrentConfsOrPlaceholder() {
      return (confStr == "") ?
      { label: emptyLabel } 
      :
      confStr.split(",").map((conf: string) => stringToOption(NicknameToConference[conf] || conf));
   }

   function getExtraConfsByTier() {
      if (tier == "All") {
        return [ "High Tier", "Medium Tier", "Low Tier", 
         ConfSelectorConstants.highMajorConfsName, ConfSelectorConstants.nonHighMajorConfsName, ConfSelectorConstants.multiName
        ];
      } else if (tier == "High") {
        return [ "All Tiers", "Medium Tier", "Low Tier", ConfSelectorConstants.highMajorConfsName ];
      } else if (tier == "Medium") {
        return [ "All Tiers", "High Tier", "Low Tier" ];
      } else if (tier == "Low") {
        return [ "All Tiers", "High Tier", "Medium Tier" ];
      } else {
        return [];
      }
    }
  
   /** Slightly hacky code to render the conference nick names */
   const ConferenceValueContainer = (props: any) => {
      const oldText = props.children[0];
      const fullConfname = oldText.props.children;
      const newText = {
      ...oldText,
      props: {
         ...oldText.props,
         children: [ConferenceToNickname[fullConfname] || fullConfname]
      }
      }
      const newProps = {
      ...props,
      children: [newText, props.children[1]]
      }
      return <components.MultiValueContainer {...newProps} />
   };

   /** The sub-header builder */
   const formatGroupLabel = (data: any) => (
      <div>
      <span>{data.label}</span>
      </div>
   );

   return <Select
      isClearable={true}
      styles={{ menu: base => ({ ...base, zIndex: 1000 }) }}
      isMulti={isMultiConfs}
      components={{ MultiValueContainer: ConferenceValueContainer }}
      value={getCurrentConfsOrPlaceholder()}
      options={[
         tier ? {
            label: "Tiers", options: getExtraConfsByTier().map(stringToOption)
         } : { label: "Groups", options: [ 
            ConfSelectorConstants.highMajorConfsName, ConfSelectorConstants.nonHighMajorConfsName, 
            ConfSelectorConstants.queryFiltersName, ConfSelectorConstants.multiName
         ].map(stringToOption) }
         ,
         { label: "Confs", options: _.sortBy(confsWithTeams).map(stringToOption) },
      ]}
      formatGroupLabel={formatGroupLabel}
      filterOption={createFilter({
         ignoreCase: true, ignoreAccents: true, matchFrom: 'any', trim: true,
         stringify: (option: any) => `${option.value} ${ConferenceToNickname[option.value]}`
      })}
      onChange={(optionsIn) => {
         const options = (isMultiConfs ? optionsIn : [ optionsIn ]) as Array<any>;
         const selection = (options || [])
            .map(option => ((option as any)?.value || "").replace(/ *\[.*\]/, ""));
         const isStillMultiConf = _.some(selection, sel => sel == ConfSelectorConstants.multiName);
         const finalSelection = selection.filter((t: string) => t != "").map((c: string) => ConferenceToNickname[c] || c);
         const maybeTier = _.find(selection, sel => sel.indexOf("Tier") >= 0);
         if (maybeTier) {
            onChangeConf(maybeTier); //(tier change overrides everything else)
         } else {
            const confStr = (isStillMultiConf ? finalSelection : _.take(finalSelection, 1)).join(",")
            onChangeConf(confStr);
         }
      }}
   />;
};
export default ConferenceSelector;
