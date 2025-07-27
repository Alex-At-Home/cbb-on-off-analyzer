// React imports:
import React, { useState, useEffect } from "react";
import Router from "next/router";

import _ from "lodash";

// Additional components:
//@ts-ignore
import Select, { components, createFilter } from "react-select";
import { PlayerCodeId } from "../../utils/StatModels";
import ThemedSelect from "./ThemedSelect";

type Props = {
  emptyLabel?: string;
  playerSelectionStr: string; //(; separated list of player codes)
  players: Array<PlayerCodeId>;
  onChangePlayerSelection: (newPlayerSelectionStr: string) => void;
};

const PlayerSelector: React.FunctionComponent<Props> = ({
  emptyLabel,
  playerSelectionStr,
  players,
  onChangePlayerSelection,
}) => {
  const playerArray = playerSelectionStr.split(";");

  function stringToOption(s: string) {
    const playerFromCode = _.find(players || [], (p) => p.code == s) || {
      id: s,
      code: s,
    };
    return { label: playerFromCode.id, value: playerFromCode.code };
  }
  function playerCodeIdToOption(s: PlayerCodeId) {
    return { label: s.id, value: s.code };
  }

  function getCurrentPlayersOrPlaceholder() {
    return playerSelectionStr == ""
      ? { label: emptyLabel || "Select Players" }
      : playerSelectionStr
          .split(";")
          .map((player: string) => stringToOption(player));
  }

  /** Slightly hacky code to format the player names before rendering */
  const PlayerNameValueContainer = (props: any) => {
    const oldText = props.children[0];
    const playerName = oldText.props.children;
    const newText = {
      ...oldText,
      props: {
        ...oldText.props,
        children: [playerName],
      },
    };
    const newProps = {
      ...props,
      children: [newText, props.children[1]],
    };
    return <components.MultiValueContainer {...newProps} />;
  };

  return (
    <ThemedSelect
      isClearable={true}
      isMulti={true}
      styles={{ menu: (base: any) => ({ ...base, zIndex: 1000 }) }}
      components={{ MultiValueContainer: PlayerNameValueContainer }}
      value={getCurrentPlayersOrPlaceholder()}
      options={(players || []).map(playerCodeIdToOption)}
      filterOption={createFilter({
        ignoreCase: true,
        ignoreAccents: true,
        matchFrom: "any",
        trim: true,
        stringify: (option: any) => `${option.value} ${option.label}`,
      })}
      onChange={(optionsIn: any) => {
        const options = optionsIn as Array<any>;
        const selection = (options || []).map(
          (option) => (option as any)?.value || ""
        );
        if (selection.length <= 5) {
          const finalSelection = selection
            .filter((t: string) => t != "")
            .map((c: string) => c);
          onChangePlayerSelection(finalSelection.join(";"));
        }
      }}
    />
  );
};
export default PlayerSelector;
