// React imports:
import React, { useState, useEffect, useRef } from "react";

// Lodash:
import _, { isNumber, some, values } from "lodash";

// Bootstrap imports:

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import Button from "react-bootstrap/Button";

// Additional components:
// @ts-ignore
import LoadingOverlay from "@ronchalant/react-loading-overlay";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLink } from "@fortawesome/free-solid-svg-icons";
import ClipboardJS from "clipboard";

// Component imports
import ConferenceSelector, {
  ConfSelectorConstants,
} from "./shared/ConferenceSelector";

// Table building
// Util imports
import {
  ParamDefaults,
  TeamStatsExplorerChartParams,
  TeamStatsExplorerParams,
} from "../utils/FilterModels";

import { AvailableTeams } from "../utils/internal-data/AvailableTeams";
import { DateUtils } from "../utils/DateUtils";
import { Dropdown, InputGroup, ModalTitle } from "react-bootstrap";

import { CbbColors } from "../utils/CbbColors";
import { ConferenceToNickname } from "../utils/public-data/ConferenceInfo";
import { AdvancedFilterUtils } from "../utils/AdvancedFilterUtils";
import GenericCollapsibleCard from "./shared/GenericCollapsibleCard";
import ThemedSelect from "./shared/ThemedSelect";
import ChartConfigContainer from "./shared/ChartConfigContainer";
import ExplorerChart from "./shared/ExplorerChart";
import { decompAxis } from "../utils/ExplorerChartUtils";
import { useTheme } from "next-themes";
import TeamStatsExplorerTable, {
  TeamStatsExplorerModel,
} from "./TeamStatsExplorerTable";
import { LuckUtils } from "../utils/stats/LuckUtils";
import { TeamEvalUtils } from "../utils/stats/TeamEvalUtils";
import YearSelector from "./shared/YearSelector";
import TeamFilterAutoSuggestText from "./shared/TeamFilterAutoSuggestText";
import {
  DivisionStatsCache,
  GradeTableUtils,
} from "../utils/tables/GradeTableUtils";
import PageAnnotationSystem from "./shared/PageAnnotationSystem";

type Props = {
  startingState: TeamStatsExplorerChartParams;
  dataEvent: TeamStatsExplorerModel;
  onChangeState: (newParams: TeamStatsExplorerChartParams) => void;
};

/** The list of pre-built team charts, exported so that other elements can list them */
export const overallTeamChartPresets = [
  [
    "Efficiency Landscape",
    {
      title:
        "'Efficiency Landscape' - adjusted offensive vs defensive efficiency",
      datasetFilter: "ALL SORT_BY adj_net",
      xAxis: "Adjusted Off",
      yAxis: "Adjusted Def //INVERT true",
      dotColor: "Adjusted Margin",
      dotSize: "wab",
      dotColorMap: "Red/Green Auto",
      labelStrategy: "Top/Bottom 10",
      pointMarkerType: "Team Logo (small)",
    },
  ],
  [
    "WAB vs Efficiency",
    {
      title: "Wins Above Bubble vs Efficiency (outliers labelled)",
      datasetFilter: "rank_adj_net <= 75 SORT_BY wab - exp_wab",
      xAxis: "Adjusted Margin",
      yAxis: "wab",
      dotColor: "wab - exp_wab",
      dotSize: "wab",
      dotColorMap: "Red/Green Auto",
      labelStrategy: "Top/Bottom 10",
      pointMarkerType: "Team Logo (small)",
    },
  ],
  [
    "Assist Rate vs Offense",
    {
      title:
        "Is there a correlation between assist rate and good offense? (P5 highlighted)",
      datasetFilter: "ALL SORT_BY off_adj_ppp",
      highlightFilter: `P5 (2024+)`,
      xAxis: "off_adj_ppp //LIMITS 90,140",
      yAxis: "100*off_assist //LIMITS 40,75",
      dotColor: "Adjusted Off",
      dotSize: "Adjusted Margin",
      dotColorMap: "Red/Green Auto",
      labelStrategy: "Top/Bottom 25",
      pointMarkerType: "Team Logo (small)",
    },
  ],
  [
    "Offensive Style (Pace/On-vs-Off-ball)",
    {
      title: "Offensive Style (Pace is part tempo part transition frequency)",
      datasetFilter: "SORT_BY off_adj_ppp",
      xAxis: "Off-Ball Frequency",
      yAxis:
        "0.5*pctile_tempo + 0.5*pctile_off_style_transition_pct //LABEL Pace Stat",
      dotColor: "Adjusted Off",
      dotSize: "wab",
      dotColorMap: "Red/Green Auto",
      labelStrategy: "None",
      pointMarkerType: "Team Logo (small)",
    },
  ],
  [
    "Offensive Style (Guards-vs-bigs/On-vs-Off-ball)",
    {
      title:
        "Half court play style: backcourt vs frontcourt / on-ball vs off-ball",
      datasetFilter: "SORT_BY off_adj_ppp",
      xAxis: "Off-Ball Frequency",
      yAxis: "Backcourt-ish Play Frequency",
      dotColor: "Adjusted Off",
      dotSize: "wab",
      dotColorMap: "Red/Green Auto",
      labelStrategy: "None",
      pointMarkerType: "Team Logo (small)",
    },
  ],
  [
    "On-Ball vs Off-Ball (T75)",
    {
      title: "Half-Court On-Ball vs Off-Ball frequency",
      datasetFilter: "rank_adj_net <= 75 SORT_BY off_adj_ppp",
      xAxis: "On-Ball Frequency",
      yAxis: "Off-Ball Frequency",
      dotColor: "Adjusted Off",
      dotSize: "wab",
      dotColorMap: "Red/Green Auto",
      labelStrategy: "Top/Bottom 25",
      pointMarkerType: "Colored Dot",
    },
  ],
  [
    "On-Ball Frequency vs Efficiency (T75)",
    {
      title: "Half-Court On-Ball frequency vs efficiency",
      datasetFilter: "rank_adj_net <= 75 SORT_BY off_adj_ppp",
      xAxis: "On-Ball Frequency",
      yAxis: "On-Ball Efficiency",
      dotColor: "Adjusted Off",
      dotSize: "wab",
      dotColorMap: "Red/Green Auto",
      labelStrategy: "Top/Bottom 25",
      pointMarkerType: "Team Logo (small)",
    },
  ],
  [
    "Off-Ball Frequency vs Efficiency (T75)",
    {
      title: "Half-Court Off-Ball frequency vs efficiency",
      datasetFilter: "rank_adj_net <= 75 SORT_BY off_adj_ppp",
      xAxis: "Off-Ball Frequency",
      yAxis: "Off-Ball Efficiency",
      dotColor: "Adjusted Off",
      dotSize: "wab",
      dotColorMap: "Red/Green Auto",
      labelStrategy: "Top/Bottom 25",
      pointMarkerType: "Team Logo (small)",
    },
  ],
  [
    "Shooting Proximity (Off/Def)",
    {
      title: "Shooting Proximity - Off vs Def (T75)",
      datasetFilter: "T75 Adj Net",
      xAxis: "Shooting Proximity",
      yAxis: "Oppo Shooting Proximity",
      dotColor: "Adjusted Margin (%ile)",
      dotSize: "power",
      dotColorMap: "Red/Green Auto",
      labelStrategy: "Top/Bottom 25",
      pointMarkerType: "Team Logo (small)",
    },
  ],
  [
    "Shooting Proximity (Off)",
    {
      title: "Shooting Proximity vs Offensive Efficency (T75)",
      datasetFilter: "T75 Adj Net",
      xAxis: "Shooting Proximity",
      yAxis: "Adjusted Off",
      dotColor: "Adjusted Off",
      dotSize: "power",
      dotColorMap: "Red/Green Auto",
      labelStrategy: "Top/Bottom 25",
      pointMarkerType: "Colored Dot",
    },
  ],
  [
    "3P Shooting",
    {
      title: "3P Attempt Rate vs 3P Percentage (T75)",
      datasetFilter: "T75 Adj Net",
      xAxis: "3P Rate",
      yAxis: "3P%",
      dotColor: "Adjusted Off",
      dotSize: "power",
      dotColorMap: "Red/Green Auto",
      labelStrategy: "Top/Bottom 25",
      pointMarkerType: "Team Logo (small)",
    },
  ],
  [
    "3P Assist Analysis",
    {
      title: "Do teams that shoot more assisted 3s shoot better?",
      datasetFilter: "ALL SORT_BY off_threep",
      xAxis: "3P Ast'd%",
      yAxis: "3P%",
      dotColor: "3P Rate",
      dotSize: "3P% (%ile)",
      dotColorMap: "Blue/Orange Auto",
      labelStrategy: "Top/Bottom 25",
      pointMarkerType: "Colored Dot",
    },
  ],
  [
    "Benefit of 3P% on Post-Up efficiency",
    {
      title: "T50 frequency post-up teams: 3P% vs Post-Up pts/100",
      datasetFilter: "rank_off_style_post_up_pct <= 50",
      xAxis: "3P%",
      yAxis: "100*off_style_post_up_ppp //LABEL Post-Up Pts/100",
      dotColor: "pctile_off_style_post_up_pct",
      dotSize: "3P Rate",
      dotColorMap: "Blue/Orange Auto",
      labelStrategy: "Top/Bottom 25",
      pointMarkerType: "Team Logo (small)",
    },
  ],
] as Array<[string, TeamStatsExplorerChartParams]>;

/** A sensible looking set of bubble offenses for the hypo where the actual year is not available */
const fallbackBubbleOffense = [
  115.9, 113.2, 114.7, 113.4, 114.3, 114.1, 117.8, 114.6, 115.2, 113.1,
];
/** A sensible looking set of bubble offenses for the hypo where the actual year is not available */
const fallbackBubbleDefense = [
  99.5, 96.9, 98.7, 97.4, 98.4, 98.4, 102.1, 99.2, 100, 98.1,
];

const axisPresets = [
  // Top level
  ["Adjusted Margin", "adj_net"],
  ["Adjusted Margin (%ile)", "100*pctile_adj_net"],
  ["Adjusted Off", "off_adj_ppp"],
  ["Adjusted Off (%ile)", "100*pctile_off_adj_ppp"],
  ["Adjusted Def", "def_adj_ppp"],
  ["Adjusted Def (%ile)", "100*pctile_def_adj_ppp"],
  ["Raw Off", "off_ppp"],
  ["Raw Off (%ile)", "100*pctile_off_ppp"],
  ["Raw Def", "def_ppp"],
  ["Raw Def (%ile)", "100*pctile_def_ppp"],
  ["Raw Margin", "raw_net"],
  ["Raw Margin (%ile)", "100*pctile_raw_net"],
  ["SoS", "off_adj_opp"],
  ["SoS (%ile)", "100*pctile_off_adj_opp"],
  ["Tempo", "tempo"],
  ["Tempo (%ile)", "100*pctile_tempo"],

  // Team power stats
  ["WABubble", "wab"],
  ["WAElite", "wae"],
  ["Margin-as-WAB", "exp_wab"],
  ["Power", "power"],

  // Some advanced derived style stats:
  [
    "On-Ball Frequency",
    "100*(off_style_rim_attack_pct + off_style_dribble_jumper_pct + off_style_mid_range_pct + off_style_post_up_pct) / (off_style_rim_attack_pct + off_style_dribble_jumper_pct + off_style_mid_range_pct + off_style_post_up_pct + off_style_attack_kick_pct + off_style_perimeter_cut_pct + off_style_big_cut_roll_pct + off_style_post_kick_pct + off_style_high_low_pct + off_style_pick_pop_pct)",
  ],
  [
    "On-Ball Efficiency",
    "(off_style_rim_attack_pct*off_style_rim_attack_ppp + off_style_dribble_jumper_pct*off_style_dribble_jumper_ppp + off_style_mid_range_pct*off_style_mid_range_ppp + off_style_post_up_pct*off_style_post_up_ppp)/(off_style_rim_attack_pct + off_style_dribble_jumper_pct + off_style_mid_range_pct + off_style_post_up_pct)",
  ],
  [
    "Off-Ball Frequency",
    "100*(off_style_attack_kick_pct + off_style_perimeter_cut_pct + off_style_big_cut_roll_pct  + off_style_post_kick_pct + off_style_high_low_pct + off_style_pick_pop_pct) /(off_style_rim_attack_pct + off_style_dribble_jumper_pct + off_style_mid_range_pct + off_style_post_up_pct + off_style_attack_kick_pct + off_style_perimeter_cut_pct + off_style_big_cut_roll_pct + off_style_post_kick_pct + off_style_high_low_pct + off_style_pick_pop_pct)",
  ],
  [
    "Off-Ball Efficiency",
    "(off_style_attack_kick_pct*off_style_attack_kick_ppp + off_style_perimeter_cut_pct*off_style_perimeter_cut_ppp + off_style_big_cut_roll_pct*off_style_big_cut_roll_ppp  + off_style_post_kick_pct*off_style_post_kick_ppp + off_style_high_low_pct*off_style_high_low_ppp  + off_style_pick_pop_pct*off_style_pick_pop_ppp) / (off_style_attack_kick_pct + off_style_perimeter_cut_pct + off_style_big_cut_roll_pct  + off_style_post_kick_pct + off_style_high_low_pct + off_style_pick_pop_pct)",
  ],

  [
    "Frontcourt-ish Play Frequency",
    "100*(off_style_post_up_pct + off_style_big_cut_roll_pct + off_style_post_kick_pct + off_style_high_low_pct + off_style_pick_pop_pct) / (off_style_rim_attack_pct + off_style_dribble_jumper_pct + off_style_mid_range_pct + off_style_post_up_pct + off_style_attack_kick_pct + off_style_perimeter_cut_pct + off_style_big_cut_roll_pct + off_style_post_kick_pct + off_style_high_low_pct + off_style_pick_pop_pct)",
  ],
  [
    "Frontcourt-ish Play Efficiency",
    "(off_style_post_up_pct*off_style_post_up_ppp + off_style_big_cut_roll_pct*off_style_big_cut_roll_ppp + off_style_post_kick_pct*off_style_post_kick_ppp + off_style_high_low_pct*off_style_high_low_ppp + off_style_pick_pop_pct*off_style_pick_pop_ppp)/(off_style_post_up_pct + off_style_big_cut_roll_pct + off_style_post_kick_pct + off_style_high_low_pct + off_style_pick_pop_pct)",
  ],
  [
    "Backcourt-ish Play Frequency",
    "100*(off_style_rim_attack_pct + off_style_dribble_jumper_pct + off_style_mid_range_pct + off_style_attack_kick_pct + off_style_perimeter_cut_pct) /(off_style_rim_attack_pct + off_style_dribble_jumper_pct + off_style_mid_range_pct + off_style_post_up_pct + off_style_attack_kick_pct + off_style_perimeter_cut_pct + off_style_big_cut_roll_pct + off_style_post_kick_pct + off_style_high_low_pct + off_style_pick_pop_pct)",
  ],
  [
    "Backcourt-ish Play Efficiency",
    "(off_style_rim_attack_pct*off_style_rim_attack_ppp + off_style_dribble_jumper_pct*off_style_dribble_jumper_ppp + off_style_mid_range_pct*off_style_mid_range_ppp + off_style_attack_kick_pct*off_style_attack_kick_ppp + off_style_perimeter_cut_pct*off_style_perimeter_cut_ppp) / (off_style_rim_attack_pct + off_style_dribble_jumper_pct + off_style_mid_range_pct + off_style_attack_kick_pct + off_style_perimeter_cut_pct)",
  ],

  // Four factors
  ["eFG%", "100*off_efg"],
  ["eFG% (%ile)", "100*pctile_off_efg"],
  ["Oppo eFG%", "100*def_efg"],
  ["Oppo eFG% (%ile)", "100*pctile_def_efg"],
  ["TO%", "100*off_to"],
  ["TO% (%ile)", "100*pctile_off_to"],
  ["Def TO%", "100*def_to"],
  ["Def TO% (%ile)", "100*pctile_def_to"],
  ["ORB%", "100*off_orb"],
  ["ORB% (%ile)", "100*pctile_off_orb"],
  ["DRB%", "100 - 100*def_orb"],
  ["DRB% (%ile)", "100*pctile_def_orb"],
  ["Oppo ORB%", "100*def_orb"],
  ["Oppo ORB% (%ile)", "100*pctile_def_orb"],
  ["FT Rate", "100*off_ftr"],
  ["FT Rate (%ile)", "100*pctile_off_ftr"],
  ["Oppo FT Rate", "100*def_ftr"],
  ["Oppo FT Rate (%ile)", "100*pctile_def_ftr"],

  // Shot creation and assists
  ["Ast%", "100*off_assist"],
  ["Ast% (%ile)", "100*pctile_off_assist"],
  ["Oppo Ast%", "100*def_assist"],
  ["Oppo Ast% (%ile)", "100*pctile_def_assist"],
  ["3P Rate", "100*off_threepr"],
  ["3P Rate (%ile)", "100*pctile_off_threepr"],
  ["Oppo 3P Rate", "100*def_threepr"],
  ["Oppo 3P Rate (%ile)", "100*pctile_def_threepr"],
  ["Mid Rate", "100*off_twopmidr"],
  ["Mid Rate (%ile)", "100*pctile_off_twopmidr"],
  ["Oppo Mid Rate", "100*def_twopmidr"],
  ["Oppo Mid Rate (%ile)", "100*pctile_def_twopmidr"],
  ["Rim Rate", "100*off_twoprimr"],
  ["Rim Rate (%ile)", "100*pctile_off_twoprimr"],
  ["Oppo Rim Rate", "100*def_twoprimr"],
  ["Oppo Rim Rate (%ile)", "100*pctile_def_twoprimr"],
  // Shooting proximity
  ["Shooting Proximity", "3*off_threepr + 2*off_twopmidr + off_twoprimr"],
  ["Oppo Shooting Proximity", "3*def_threepr + 2*def_twopmidr + def_twoprimr"],

  // Shooting
  ["3P%", "100*off_threep"],
  ["3P% (%ile)", "100*pctile_off_threep"],
  ["Oppo 3P%", "100*def_threep"],
  ["Oppo 3P% (%ile)", "100*pctile_def_threep"],
  ["2P%", "100*off_twop"],
  ["2P% (%ile)", "100*pctile_off_twop"],
  ["Oppo 2P%", "100*def_twop"],
  ["Oppo 2P% (%ile)", "100*pctile_def_twop"],
  ["Rim 2P%", "100*off_twoprim"],
  ["Rim 2P% (%ile)", "100*pctile_off_twoprim"],
  ["Oppo Rim 2P%", "100*def_twoprim"],
  ["Oppo Rim 2P% (%ile)", "100*pctile_def_twoprim"],
  ["Mid 2P%", "100*off_twopmid"],
  ["Mid 2P% (%ile)", "100*pctile_off_twopmid"],
  ["Oppo Mid 2P%", "100*def_twopmid"],
  ["Oppo Mid 2P% (%ile)", "100*pctile_def_twopmid"],
  ["FT%", "100*off_ft"],
  ["FT% (%ile)", "100*pctile_off_ft"],
  ["Oppo FT%", "100*def_ft"],
  ["Oppo FT% (%ile)", "100*pctile_def_ft"],
  // Opponent shooting
  ["3P% SoS", "100*def_3p_opp"],
  ["3P% SoS (%ile)", "100*pctile_def_3p_opp"],

  // Assist details (don't have %iles for mid-range ast/assisted numbers)
  ["Rim Ast%", "100*off_ast_rim"],
  ["Rim Ast% (%ile)", "100*pctile_off_ast_rim"],
  ["Oppo Rim Ast%", "100*def_ast_rim"],
  ["Oppo Rim Ast% (%ile)", "100*pctile_def_ast_rim"],
  ["3P Ast%", "100*off_ast_threep"],
  ["3P Ast% (%ile)", "100*pctile_off_ast_threep"],
  ["Oppo 3P Ast%", "100*def_ast_threep"],
  ["Oppo 3P Ast% (%ile)", "100*pctile_def_ast_threep"],
  ["3P Ast'd%", "100*off_threep_ast"],
  ["3P Ast'd% (%ile)", "100*pctile_off_threep_ast"],
  ["Oppo 3P Ast'd%", "100*def_threep_ast"],
  ["Oppo 3P Ast'd% (%ile)", "100*pctile_def_threep_ast"],
  ["Rim Ast'd%", "100*off_twoprim_ast"],
  ["Rim Ast'd% (%ile)", "100*pctile_off_twoprim_ast"],
  ["Oppo Rim Ast'd%", "100*def_twoprim_ast"],
  ["Oppo Rim Ast'd% (%ile)", "100*pctile_def_twoprim_ast"],
  ["Mid Ast'd%", "100*off_twopmid_ast"],
  ["Oppo Mid Ast'd%", "100*def_twopmid_ast"],

  // Extra defensive stats
  ["Stl%", "100*def_stl"],
  ["Stl% (%ile)", "100*pctile_def_stl"],
  ["Non-Stl TO%", "100*def_to_nonstl"],
  ["Non-Stl TO% (%ile)", "100*pctile_def_to_nonstl"],
  ["Blk%", "100*def_blk"],
  ["Blk% (%ile)", "100*pctile_def_blk"],
  ["Stock%", "100*def_stk"],
  ["Stock% (%ile)", "100*pctile_def_stk"],
  ["Oppo Stl%", "100*off_stl"],
  ["Oppo Stl% (%ile)", "100*pctile_off_stl"],
  ["Oppo Non-Stl TO%", "100*off_to_nonstl"],
  ["Oppo Non-Stl TO% (%ile)", "100*pctile_off_to_nonstl"],
  ["Oppo Blk%", "100*off_blk"],
  ["Oppo Blk% (%ile)", "100*pctile_off_blk"],
  ["Oppo Stock%", "100*off_stk"],
  ["Oppo Stock% (%ile)", "100*pctile_off_stk"],

  // Play Types - Transition
  ["Trans Freq", "100*off_trans_pct"],
  ["Trans Freq (%ile)", "100*pctile_off_trans_pct"],
  ["Oppo Trans Freq", "100*def_trans_pct"],
  ["Oppo Trans Freq (%ile)", "100*pctile_def_trans_pct"],
  ["Trans PPP", "off_trans_ppp"],
  ["Trans PPP (%ile)", "100*pctile_off_trans_ppp"],
  ["Oppo Trans PPP", "def_trans_ppp"],
  ["Oppo Trans PPP (%ile)", "100*pctile_def_trans_ppp"],
  ["Trans Delta PPP", "off_trans_delta_ppp"],
  ["Trans Delta PPP (%ile)", "100*pctile_off_trans_delta_ppp"],
  ["Oppo Trans Delta PPP", "def_trans_delta_ppp"],
  ["Oppo Trans Delta PPP (%ile)", "100*pctile_def_trans_delta_ppp"],
  ["Trans eFG%", "100*off_trans_efg"],
  ["Oppo Trans eFG%", "100*def_trans_efg"],
  ["Trans 2P%", "100*off_trans_twop"],
  ["Oppo Trans 2P%", "100*def_trans_twop"],
  ["Trans 3P%", "100*off_trans_threep"],
  ["Oppo Trans 3P%", "100*def_trans_threep"],
  ["Trans Rim%", "100*off_trans_twoprim"],
  ["Oppo Trans Rim%", "100*def_trans_twoprim"],
  ["Trans Mid%", "100*off_trans_twopmid"],
  ["Oppo Trans Mid%", "def_trans_twopmid"],
  ["Trans FT%", "100*off_trans_ft"],
  ["Oppo Trans FT%", "100*def_trans_ft"],
  ["Trans FTR", "100*off_trans_ftr"],
  ["Trans FTR (%ile)", "100*pctile_off_trans_ftr"],
  ["Oppo Trans FTR", "100*def_trans_ftr"],
  ["Oppo Trans FTR (%ile)", "100*pctile_def_trans_ftr"],
  ["Trans 3P Rate", "100*off_trans_threepr"],
  ["Oppo Trans 3P Rate", "100*def_trans_threepr"],
  ["Trans Mid Rate", "off_trans_twopmidr"],
  ["Oppo Trans Mid Rate", "100*def_trans_twopmidr"],
  ["Trans Rim Rate", "100*off_trans_twoprimr"],
  ["Oppo Trans Rim Rate", "100*def_trans_twoprimr"],
  ["Trans Ast%", "100*off_trans_assist"],
  ["Oppo Trans Ast%", "100*def_trans_assist"],
  ["Trans 3P Ast'd%", "100*off_trans_threep_ast"],
  ["Oppo Trans 3P Ast'd%", "100*def_trans_threep_ast"],
  ["Trans Rim Ast'd%", "100*off_trans_twoprim_ast"],
  ["Oppo Trans Rim Ast'd%", "100*def_trans_twoprim_ast"],
  ["Trans Mid Ast'd%", "100*off_trans_twopmid_ast"],
  ["Oppo Trans Mid Ast'd%", "100*def_trans_twopmid_ast"],
  ["Trans 2P Ast'd%", "100*off_trans_twop_ast"],
  ["Oppo Trans 2P Ast'd%", "100*def_trans_twop_ast"],

  // Play Types - Scramble
  ["Scramble Freq", "100*off_scramble_pct"],
  ["Scramble Freq (%ile)", "100*pctile_off_scramble_pct"],
  ["Oppo Scramble Freq", "100*def_scramble_pct"],
  ["Oppo Scramble Freq (%ile)", "100*pctile_def_scramble_pct"],
  ["Scramble PPP", "100*off_scramble_ppp"],
  ["Scramble PPP (%ile)", "100*pctile_off_scramble_ppp"],
  ["Oppo Scramble PPP", "100*def_scramble_ppp"],
  ["Oppo Scramble PPP (%ile)", "100*pctile_def_scramble_ppp"],
  ["Scramble Delta PPP", "100*off_scramble_delta_ppp"],
  ["Scramble Delta PPP (%ile)", "100*pctile_off_scramble_delta_ppp"],
  ["Oppo Scramble Delta PPP", "100*def_scramble_delta_ppp"],
  ["Oppo Scramble Delta PPP (%ile)", "100*pctile_def_scramble_delta_ppp"],
  ["Scramble Per ORB", "100*off_scramble_per_orb"],
  ["Scramble Per ORB (%ile)", "100*pctile_off_scramble_per_orb"],
  ["Oppo Scramble Per ORB", "100*def_scramble_per_orb"],
  ["Oppo Scramble Per ORB (%ile)", "100*pctile_def_scramble_per_orb"],
  ["Scramble eFG%", "100*off_scramble_efg"],
  ["Oppo Scramble eFG%", "100*def_scramble_efg"],
  ["Scramble 2P%", "off_scramble_twop"],
  ["Oppo Scramble 2P%", "100*def_scramble_twop"],
  ["Scramble 3P%", "off_scramble_threep"],
  ["Oppo Scramble 3P%", "100*def_scramble_threep"],
  ["Scramble Rim%", "100*off_scramble_twoprim"],
  ["Oppo Scramble Rim%", "100*def_scramble_twoprim"],
  ["Scramble Mid%", "100*off_scramble_twopmid"],
  ["Oppo Scramble Mid%", "100*def_scramble_twopmid"],
  ["Scramble FT%", "100*off_scramble_ft"],
  ["Oppo Scramble FT%", "100*def_scramble_ft"],
  ["Scramble FTR", "100*off_scramble_ftr"],
  ["Scramble FTR (%ile)", "100*pctile_off_scramble_ftr"],
  ["Oppo Scramble FTR", "100*def_scramble_ftr"],
  ["Oppo Scramble FTR (%ile)", "100*pctile_def_scramble_ftr"],
  ["Scramble 3P Rate", "100*off_scramble_threepr"],
  ["Oppo Scramble 3P Rate", "100*def_scramble_threepr"],
  ["Scramble Mid Rate", "100*off_scramble_twopmidr"],
  ["Oppo Scramble Mid Rate", "100*def_scramble_twopmidr"],
  ["Scramble Rim Rate", "100*off_scramble_twoprimr"],
  ["Oppo Scramble Rim Rate", "100*def_scramble_twoprimr"],
  ["Scramble Ast%", "100*off_scramble_assist"],
  ["Oppo Scramble Ast%", "100*def_scramble_assist"],
  ["Scramble 3P Ast'd%", "100*off_scramble_threep_ast"],
  ["Oppo Scramble 3P Ast'd%", "100*def_scramble_threep_ast"],
  ["Scramble Rim Ast'd%", "100*off_scramble_twoprim_ast"],
  ["Oppo Scramble Rim Ast'd%", "100*def_scramble_twoprim_ast"],
  ["Scramble Mid Ast'd%", "100*off_scramble_twopmid_ast"],
  ["Oppo Scramble Mid Ast'd%", "100*def_scramble_twopmid_ast"],
  ["Scramble 2P Ast'd%", "100*off_scramble_twop_ast"],
  ["Oppo Scramble 2P Ast'd%", "100*def_scramble_twop_ast"],

  // Advanced Play Styles - Rim Attack
  ["Rim Attack Freq", "100*off_style_rim_attack_pct"],
  ["Rim Attack Freq (%ile)", "100*pctile_off_style_rim_attack_pct"],
  ["Oppo Rim Attack Freq", "100*def_style_rim_attack_pct"],
  ["Oppo Rim Attack Freq (%ile)", "100*pctile_def_style_rim_attack_pct"],
  ["Rim Attack PPP", "off_style_rim_attack_ppp"],
  ["Rim Attack PPP (%ile)", "100*pctile_off_style_rim_attack_ppp"],
  ["Oppo Rim Attack PPP", "def_style_rim_attack_ppp"],
  ["Oppo Rim Attack PPP (%ile)", "100*pctile_def_style_rim_attack_ppp"],

  // Advanced Play Styles - Attack & Kick
  ["Attack & Kick Freq", "100*off_style_attack_kick_pct"],
  ["Attack & Kick Freq (%ile)", "100*pctile_off_style_attack_kick_pct"],
  ["Oppo Attack & Kick Freq", "100*def_style_attack_kick_pct"],
  ["Oppo Attack & Kick Freq (%ile)", "100*pctile_def_style_attack_kick_pct"],
  ["Attack & Kick PPP", "off_style_attack_kick_ppp"],
  ["Attack & Kick PPP (%ile)", "100*pctile_off_style_attack_kick_ppp"],
  ["Oppo Attack & Kick PPP", "def_style_attack_kick_ppp"],
  ["Oppo Attack & Kick PPP (%ile)", "100*pctile_def_style_attack_kick_ppp"],

  // Advanced Play Styles - Dribble Jumper
  ["Dribble Jumper Freq", "100*off_style_dribble_jumper_pct"],
  ["Dribble Jumper Freq (%ile)", "100*pctile_off_style_dribble_jumper_pct"],
  ["Oppo Dribble Jumper Freq", "100*def_style_dribble_jumper_pct"],
  [
    "Oppo Dribble Jumper Freq (%ile)",
    "100*pctile_def_style_dribble_jumper_pct",
  ],
  ["Dribble Jumper PPP", "off_style_dribble_jumper_ppp"],
  ["Dribble Jumper PPP (%ile)", "100*pctile_off_style_dribble_jumper_ppp"],
  ["Oppo Dribble Jumper PPP", "def_style_dribble_jumper_ppp"],
  ["Oppo Dribble Jumper PPP (%ile)", "100*pctile_def_style_dribble_jumper_ppp"],

  // Advanced Play Styles - Mid-Range
  ["Mid-Range Freq", "100*off_style_mid_range_pct"],
  ["Mid-Range Freq (%ile)", "100*pctile_off_style_mid_range_pct"],
  ["Oppo Mid-Range Freq", "100*def_style_mid_range_pct"],
  ["Oppo Mid-Range Freq (%ile)", "100*pctile_def_style_mid_range_pct"],
  ["Mid-Range PPP", "off_style_mid_range_ppp"],
  ["Mid-Range PPP (%ile)", "100*pctile_off_style_mid_range_ppp"],
  ["Oppo Mid-Range PPP", "def_style_mid_range_ppp"],
  ["Oppo Mid-Range PPP (%ile)", "100*pctile_def_style_mid_range_ppp"],

  // Advanced Play Styles - Backdoor Cut
  ["Backdoor Cut Freq", "100*off_style_perimeter_cut_pct"],
  ["Backdoor Cut Freq (%ile)", "100*pctile_off_style_perimeter_cut_pct"],
  ["Oppo Backdoor Cut Freq", "100*def_style_perimeter_cut_pct"],
  ["Oppo Backdoor Cut Freq (%ile)", "100*pctile_def_style_perimeter_cut_pct"],
  ["Backdoor Cut PPP", "off_style_perimeter_cut_ppp"],
  ["Backdoor Cut PPP (%ile)", "100*pctile_off_style_perimeter_cut_ppp"],
  ["Oppo Backdoor Cut PPP", "def_style_perimeter_cut_ppp"],
  ["Oppo Backdoor Cut PPP (%ile)", "100*pctile_def_style_perimeter_cut_ppp"],

  // Advanced Play Styles - Big Cut & Roll
  ["Big Cut & Roll Freq", "100*off_style_big_cut_roll_pct"],
  ["Big Cut & Roll Freq (%ile)", "100*pctile_off_style_big_cut_roll_pct"],
  ["Oppo Big Cut & Roll Freq", "100*def_style_big_cut_roll_pct"],
  ["Oppo Big Cut & Roll Freq (%ile)", "100*pctile_def_style_big_cut_roll_pct"],
  ["Big Cut & Roll PPP", "off_style_big_cut_roll_ppp"],
  ["Big Cut & Roll PPP (%ile)", "100*pctile_off_style_big_cut_roll_ppp"],
  ["Oppo Big Cut & Roll PPP", "def_style_big_cut_roll_ppp"],
  ["Oppo Big Cut & Roll PPP (%ile)", "100*pctile_def_style_big_cut_roll_ppp"],

  // Advanced Play Styles - Post-Up
  ["Post-Up Freq", "100*off_style_post_up_pct"],
  ["Post-Up Freq (%ile)", "100*pctile_off_style_post_up_pct"],
  ["Oppo Post-Up Freq", "100*def_style_post_up_pct"],
  ["Oppo Post-Up Freq (%ile)", "100*pctile_def_style_post_up_pct"],
  ["Post-Up PPP", "off_style_post_up_ppp"],
  ["Post-Up PPP (%ile)", "100*pctile_off_style_post_up_ppp"],
  ["Oppo Post-Up PPP", "def_style_post_up_ppp"],
  ["Oppo Post-Up PPP (%ile)", "100*pctile_def_style_post_up_ppp"],

  // Advanced Play Styles - Post & Kick
  ["Post & Kick Freq", "100*off_style_post_kick_pct"],
  ["Post & Kick Freq (%ile)", "100*pctile_off_style_post_kick_pct"],
  ["Oppo Post & Kick Freq", "100*def_style_post_kick_pct"],
  ["Oppo Post & Kick Freq (%ile)", "100*pctile_def_style_post_kick_pct"],
  ["Post & Kick PPP", "off_style_post_kick_ppp"],
  ["Post & Kick PPP (%ile)", "100*pctile_off_style_post_kick_ppp"],
  ["Oppo Post & Kick PPP", "def_style_post_kick_ppp"],
  ["Oppo Post & Kick PPP (%ile)", "100*pctile_def_style_post_kick_ppp"],

  // Advanced Play Styles - Pick & Pop
  ["Pick & Pop Freq", "100*off_style_pick_pop_pct"],
  ["Pick & Pop Freq (%ile)", "100*pctile_off_style_pick_pop_pct"],
  ["Oppo Pick & Pop Freq", "100*def_style_pick_pop_pct"],
  ["Oppo Pick & Pop Freq (%ile)", "100*pctile_def_style_pick_pop_pct"],
  ["Pick & Pop PPP", "off_style_pick_pop_ppp"],
  ["Pick & Pop PPP (%ile)", "100*pctile_off_style_pick_pop_ppp"],
  ["Oppo Pick & Pop PPP", "def_style_pick_pop_ppp"],
  ["Oppo Pick & Pop PPP (%ile)", "100*pctile_def_style_pick_pop_ppp"],

  // Advanced Play Styles - High-Low
  ["High-Low Freq", "100*off_style_high_low_pct"],
  ["High-Low Freq (%ile)", "100*pctile_off_style_high_low_pct"],
  ["Oppo High-Low Freq", "100*def_style_high_low_pct"],
  ["Oppo High-Low Freq (%ile)", "100*pctile_def_style_high_low_pct"],
  ["High-Low PPP", "off_style_high_low_ppp"],
  ["High-Low PPP (%ile)", "100*pctile_off_style_high_low_ppp"],
  ["Oppo High-Low PPP", "def_style_high_low_ppp"],
  ["Oppo High-Low PPP (%ile)", "100*pctile_def_style_high_low_ppp"],

  // Advanced Play Styles - Put-Back
  ["Put-Back Freq", "100*off_style_reb_scramble_pct"],
  ["Put-Back Freq (%ile)", "100*pctile_off_style_reb_scramble_pct"],
  ["Oppo Put-Back Freq", "100*def_style_reb_scramble_pct"],
  ["Oppo Put-Back Freq (%ile)", "100*pctile_def_style_reb_scramble_pct"],
  ["Put-Back PPP", "off_style_reb_scramble_ppp"],
  ["Put-Back PPP (%ile)", "100*pctile_off_style_reb_scramble_ppp"],
  ["Oppo Put-Back PPP", "def_style_reb_scramble_ppp"],
  ["Oppo Put-Back PPP (%ile)", "100*pctile_def_style_reb_scramble_ppp"],

  // Advanced Play Styles - Transition (using style version)
  ["Transition Freq", "100*off_style_transition_pct"],
  ["Transition Freq (%ile)", "100*pctile_off_style_transition_pct"],
  ["Oppo Transition Freq", "100*def_style_transition_pct"],
  ["Oppo Transition Freq (%ile)", "100*pctile_def_style_transition_pct"],
  ["Transition PPP", "off_style_transition_ppp"],
  ["Transition PPP (%ile)", "100*pctile_off_style_transition_ppp"],
  ["Oppo Transition PPP", "def_style_transition_ppp"],
  ["Oppo Transition PPP (%ile)", "100*pctile_def_style_transition_ppp"],
] as Array<[string, string]>;

const TeamStatsExplorerChart: React.FunctionComponent<Props> = ({
  startingState,
  dataEvent,
  onChangeState,
}) => {
  const server =
    typeof window === `undefined` //(ensures SSR code still compiles)
      ? "server"
      : window.location.hostname;

  const { resolvedTheme } = useTheme();
  const contrastForegroundBuilder =
    resolvedTheme == "dark"
      ? CbbColors.alwaysLightGrey
      : CbbColors.alwaysDarkGrey;

  /** Only show help for diagnstic on/off on main page */
  const showHelp = !_.startsWith(server, "cbb-on-off-analyzer");

  // 1] Data model

  //(controlling the leaderboard table)
  const [statsExplorerParams, setStatsExplorerParams] = useState(
    startingState as TeamStatsExplorerParams
  );

  // (don't support tier changes)
  const tier: string = "All";

  // Data source
  const [clipboard, setClipboard] = useState(null as null | ClipboardJS);
  const [confs, setConfs] = useState(startingState.confs || "");
  const hasCustomFilter =
    confs.indexOf(ConfSelectorConstants.queryFiltersName) >= 0;

  const [year, setYear] = useState(
    startingState.year || DateUtils.mostRecentYearWithData
  );

  const [gender, setGender] = useState(
    startingState.gender || ParamDefaults.defaultGender
  );

  const [title, setTitle] = useState(startingState.title || "");

  // Basic filter:
  const manualFilterSelected =
    confs.indexOf(ConfSelectorConstants.queryFiltersName) >= 0; //(if so this will override the ordering)
  const [queryFilters, setQueryFilters] = useState(
    startingState.queryFilters || ""
  );
  const [tmpQueryFilters, setTmpQueryFilters] = useState(
    startingState.queryFilters || ""
  );
  const separatorKeyword = "BREAK"; //(not used but leave the logic in here in case we change our mind later)

  //TODO: make this generic, it's used in 3 places
  const teamList =
    year == DateUtils.AllYears || year.startsWith(DateUtils.MultiYearPrefix)
      ? _.chain(
          _.flatMap(AvailableTeams.byName, (teams, teamName) => {
            return [teamName].concat(
              // Just do "ADD_SEASON" and let user fill it in
              `${teamName}:ADD_SEASON`
              // Not doing: add every year, more intuitive but doesn't scale
              // teams
              //   .filter((t) => t.year && t.gender == gender)
              //   .map((t) => `${t.team}:${t.year.substring(2, 4)}+`)
            );
          })
        )
          .flatMap((team) => {
            const teamFrags = team.split(`:`);
            // Add aliases in:
            return [team].concat(
              (AvailableTeams.teamAliases[teamFrags[0]] || []).map((s) =>
                teamFrags[1] ? `${s}:${teamFrags[1]}` : s
              )
            );
          })
          .uniq()
          .value()
      : _.chain(
          _.flatMap(AvailableTeams.byName, (teams, __) => {
            const maybeTeam = teams.find(
              (t) => t.year == year && t.gender == gender
            );
            return maybeTeam ? [maybeTeam.team] : [];
          })
        )
          .flatMap((team) => {
            // Add aliases in:
            return [team].concat(AvailableTeams.teamAliases[team] || []);
          })
          .value();

  const { queryFiltersAsMap, queryFilterRowBreaks } = _.transform(
    queryFilters.split(";"),
    (acc, v, ii) => {
      const teamName = _.trim(v);
      if (teamName == separatorKeyword) {
        acc.queryFilterRowBreaks.add(ii - acc.queryFilterRowBreaks.size - 1);
      } else if (teamName != "") {
        const teams = [teamName].concat(AvailableTeams.teamAliases[teamName]);
        teams.forEach((team) => {
          if (team) {
            acc.queryFiltersAsMap[team] =
              1 + ii - acc.queryFilterRowBreaks.size;
          }
        });
      }
    },
    {
      queryFiltersAsMap: {} as Record<string, number>,
      queryFilterRowBreaks: new Set<number>(),
    }
  );
  const maybeFilterPromptTooltip = (
    <Tooltip id="maybeFilterPromptTooltip">
      Press Enter to apply this filter (current filter [{queryFilters}])
    </Tooltip>
  );
  const maybeFilterPrompt =
    queryFilters != tmpQueryFilters ? (
      <OverlayTrigger placement="auto" overlay={maybeFilterPromptTooltip}>
        <span>&nbsp;(*)</span>
      </OverlayTrigger>
    ) : null;

  // Chart magic:

  const [toggledEntities, settoggledEntities] = useState<
    Record<string, boolean>
  >(
    startingState.toggledEntities
      ? _.chain(startingState.toggledEntities.split(";"))
          .map((p) => [p, true])
          .fromPairs()
          .value()
      : {}
  );
  const globalScatterChartRef = React.createRef<any>();

  // All the complex config:

  // If there's a title show that, otherwise show the config
  const [showConfigOptions, setShowConfigOptions] = useState<boolean>(
    startingState.showConfig || !startingState.title
  );

  // If there's a title show that, otherwise show the config
  const [showTable, setShowTable] = useState<boolean>(
    startingState.showTable || false
  );

  // Whether to show only manually selected players in the table (if there are any)
  const [showOnlyHandSelectedInTable, setShowOnlyHandSelectedInTable] =
    useState<boolean>(
      _.isNil(startingState.showOnlyHandSelectedInTable)
        ? true
        : startingState.showOnlyHandSelectedInTable
    );

  // Filter text (show/hide):
  const [datasetFilterStr, setAdvancedFilterStr] = useState(
    startingState.datasetFilter || ""
  );
  const [datasetFilterError, setAdvancedFilterError] = useState(
    undefined as string | undefined
  );
  const datasetFilterPresets = [
    ["All teams", "ALL"],
    ["T75 Adj Net", "rank_adj_net <= 75 SORT_BY rank_adj_net"],
    ["T75 Adj Offense", "rank_off_adj_ppp <= 75 SORT_BY rank_off_adj_ppp"],
    ["T75 Adj Defense", "rank_def_adj_ppp <= 75 SORT_BY rank_def_adj_ppp"],
    ["T75 Tempo", "rank_tempo <= 75"],
    [
      "P5 (2024+)",
      `conf_nick == "B1G" OR conf_nick == "SEC" OR conf_nick == "BE" OR conf_nick == "ACC" OR conf_nick == "B12"`,
    ],
    [
      "P6 (2023-)",
      `conf_nick == "B1G" OR conf_nick == "SEC" OR conf_nick == "BE" OR conf_nick == "ACC" OR conf_nick == "B12" OR conf_nick == "P12"`,
    ],
  ] as Array<[string, string]>;

  // Highlight text (show/hide):
  const [highlightFilterStr, setHighlightFilterStr] = useState(
    startingState.highlightFilter || ""
  );
  const [highlightFilterError, setHighlightFilterError] = useState(
    undefined as string | undefined
  );

  // Chart control
  const [xAxis, setXAxis] = useState(startingState.xAxis || "");
  const [yAxis, setYAxis] = useState(startingState.yAxis || "");
  const [dotColor, setDotColor] = useState(startingState.dotColor || "");
  const [dotSize, setDotSize] = useState(startingState.dotSize || "");
  const [dotColorMap, setDotColorMap] = useState(
    startingState.dotColorMap || "Default"
  );
  const colorMapOptions = CbbColors.colorMapOptions(resolvedTheme);

  const [labelStrategy, setLabelStrategy] = useState(
    startingState.labelStrategy || "None"
  );

  const [pointMarkerType, setPointMarkerType] = useState(
    startingState.pointMarkerType || "Team Logo (small)"
  );

  // On page load, if title is specified and the other params aren't then pre-load
  const applyPresetChart = (preset: TeamStatsExplorerChartParams) => {
    friendlyChange(() => {
      setTitle(preset.title || "");
      setAdvancedFilterStr(
        datasetFilterPresets.find((t) => t[0] == preset.datasetFilter)?.[1] ||
          preset.datasetFilter ||
          ""
      );
      setHighlightFilterStr(
        datasetFilterPresets.find((t) => t[0] == preset.highlightFilter)?.[1] ||
          preset.highlightFilter ||
          ""
      );
      const xAxisFrags = (preset.xAxis || "").split("//", 2).map(_.trim);
      setXAxis(
        (axisPresets.find((t) => t[0] == xAxisFrags[0])?.[1] ||
          xAxisFrags[0] ||
          "") + (xAxisFrags.length > 1 ? ` //${xAxisFrags[1]}` : "")
      );
      const yAxisFrags = (preset.yAxis || "").split("//", 2).map(_.trim);
      setYAxis(
        (axisPresets.find((t) => t[0] == yAxisFrags[0])?.[1] ||
          yAxisFrags[0] ||
          "") + (yAxisFrags.length > 1 ? ` //${yAxisFrags[1]}` : "")
      );
      setDotColor(
        axisPresets.find((t) => t[0] == preset.dotColor)?.[1] ||
          preset.dotColor ||
          ""
      );
      setDotSize(
        axisPresets.find((t) => t[0] == preset.dotSize)?.[1] ||
          preset.dotSize ||
          ""
      );
      setDotColorMap(preset.dotColorMap || "Default");
      setLabelStrategy(preset.labelStrategy || "None");
      setPointMarkerType(preset.pointMarkerType || "Team Logo (small)");
    }, preset.title != title);
  };
  // Load presets on page startup
  useEffect(() => {
    if (title && !xAxis && !yAxis) {
      const maybePreset = _.find(
        overallTeamChartPresets,
        (kv) => kv[0] == title || kv[1]?.title == title
      );
      if (maybePreset) applyPresetChart(maybePreset[1]);
    }
  }, []);

  // Grades:

  const [divisionStatsCache, setDivisionStatsCache] = useState<
    Record<string, DivisionStatsCache>
  >({});
  /** TODO: this is used to trigger the memoized table, but not sure it works since the caches could be stale
   * since I'm not using a ref? Maybe it's OK because it's in a memo not an effect?
   */
  const [divisionStatsRefresh, setDivisionStatsRefresh] = useState<number>(0);

  const showGrades = ParamDefaults.defaultEnabledGrade;

  // Events that trigger building or rebuilding the division stats cache
  useEffect(() => {
    // (could make it only do this if a style / rank / %ile is mentioned, but doesn't seem worth it)
    const yearsToCheck = _.thru(undefined, (__) => {
      if (year == DateUtils.AllYears) {
        return DateUtils.coreYears;
      } else if (year.startsWith(DateUtils.MultiYearPrefix)) {
        return DateUtils.getMultiYearSelection(year);
      } else {
        return [year];
      }
    });
    yearsToCheck.forEach((yearToCheck) => {
      const currCacheForThisYear = divisionStatsCache[yearToCheck] || {};
      const yearOrGenderChanged =
        yearToCheck != currCacheForThisYear.year ||
        gender != currCacheForThisYear.gender;

      if (_.isEmpty(currCacheForThisYear) || yearOrGenderChanged) {
        if (!_.isEmpty(currCacheForThisYear)) {
          setDivisionStatsCache((currCache) => ({
            ...currCache,
            [yearToCheck]: {},
          })); //unset if set
        }
        GradeTableUtils.populateTeamDivisionStatsCache(
          { year: yearToCheck, gender },
          (newCache) => {
            setDivisionStatsCache((currCache) => ({
              ...currCache,
              [yearToCheck]: newCache,
            }));
            setDivisionStatsRefresh((curr) => curr + 1);
          }
        );
      }
    });
  }, [year, gender]);

  /** When the params change */
  useEffect(() => {
    onChangeState({
      ...statsExplorerParams,
      year: year,
      gender,
      confs,
      queryFilters: queryFilters,
      title: title,
      datasetFilter: datasetFilterStr,
      highlightFilter: highlightFilterStr,
      xAxis: xAxis,
      yAxis: yAxis,
      dotSize: dotSize,
      dotColor: dotColor,
      showConfig: showConfigOptions,
      dotColorMap: dotColorMap,
      labelStrategy: labelStrategy,
      pointMarkerType: pointMarkerType,
      toggledEntities: _.keys(toggledEntities).join(";"),
      showTable: showTable,
      showOnlyHandSelectedInTable: showOnlyHandSelectedInTable,
    });
  }, [
    confs,
    year,
    gender,
    queryFilters,
    datasetFilterStr,
    highlightFilterStr,
    title,
    xAxis,
    yAxis,
    dotColor,
    dotColorMap,
    dotSize,
    showConfigOptions,
    labelStrategy,
    pointMarkerType,
    statsExplorerParams,
    toggledEntities,
    showOnlyHandSelectedInTable,
    showTable,
  ]);

  /** Set this to be true on expensive operations */
  const [loadingOverride, setLoadingOverride] = useState(false);

  useEffect(() => {
    // Add and remove clipboard listener
    initClipboard();

    if (typeof document !== `undefined`) {
      //(if we added a clipboard listener, then remove it on page close)
      return () => {
        if (clipboard) {
          clipboard.destroy();
          setClipboard(null);
        }
      };
    }
  });

  /** This grovelling is needed to ensure that clipboard is only loaded client side */
  function initClipboard() {
    if (null == clipboard) {
      var newClipboard = new ClipboardJS(`#copyLink_playerSeasonComparison`, {
        text: function (trigger) {
          return window.location.href;
        },
      });
      newClipboard.on("success", (event: ClipboardJS.Event) => {
        //(unlike other tables, don't add to history)
        // Clear the selection in some visually pleasing way
        setTimeout(function () {
          event.clearSelection();
        }, 150);
      });
      setClipboard(newClipboard);
    }
  }

  /** At the expense of some time makes it easier to see when changes are happening */
  const friendlyChange = (
    change: () => void,
    guard: boolean,
    timeout: number = 250
  ) => {
    if (guard) {
      setLoadingOverride(true);
      setTimeout(() => {
        change();
      }, timeout);
    }
  };

  // Viewport management

  const [height, setHeight] = useState(512);
  const [screenHeight, setScreenHeight] = useState(512);
  const [screenWidth, setScreenWidth] = useState(512);
  //(would only need these if using dynamic sizing)
  // const latestScreenHeight = useRef(screenHeight);
  // const latestScreenWidth = useRef(screenWidth);
  const calcWidthHeight = (): [number, number] => {
    const baseHeight = Math.max(0.75 * window.innerHeight, 400);
    const baseWidth = Math.max(baseHeight, Math.max(window.innerWidth, 400));
    return [baseWidth, baseHeight];
  };
  useEffect(() => {
    function handleResize() {
      setTimeout(() => {
        setHeight(window.innerHeight);
        const [baseWidth, baseHeight] = calcWidthHeight();
        // Only bother setting these expensive vars if they chance enough
        if (
          Math.abs(baseHeight - screenHeight) > 25 ||
          Math.abs(baseWidth - screenWidth) > 25
        ) {
          setScreenHeight(baseHeight);
          setScreenWidth(baseWidth);
        }
      }, 250);
    }
    window.addEventListener("resize", handleResize);
    setHeight(window.innerHeight);
    const [baseWidth, baseHeight] = calcWidthHeight();
    setScreenHeight(baseHeight);
    setScreenWidth(baseWidth);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 2] Processing

  // Tooltip builder (doesn't need to be closed in React.useMemo below)

  type CustomTooltipProps = {
    active?: boolean;
    payload?: any;
    label?: string;
  };
  const CustomTooltip: React.FunctionComponent<CustomTooltipProps> = ({
    active,
    payload,
    label,
  }) => {
    if (active) {
      const data = payload?.[0].payload || {};
      if (!data.showTooltips) return null; //(if showing sub-chart don't show tooltips for main chart)

      const teamObj = data.p;

      // Helper function to get field value safely
      const getFieldValue = (field: string) => {
        return teamObj?.[field]?.value ?? teamObj?.[field] ?? 0;
      };

      // Helper function to get rank safely
      //TODO: this doesn't work but will leave for now
      const getRank = (field: string) => {
        const rankField = `rank_${field}`;
        return teamObj?.[rankField]?.value ?? teamObj?.[rankField];
      };

      // Get axis values
      const xValue = data.x;
      const yValue = data.y;
      const sizeValue = data.z;
      const colorValue = data.p.color;

      // Get axis labels
      return (
        <div
          className="custom-tooltip"
          style={{
            background:
              resolvedTheme == "dark"
                ? "rgba(0, 0, 0, 0.9)"
                : "rgba(238, 238, 238, 0.9)",
          }}
        >
          <small>
            <p className="label">
              <b>{`${teamObj?.team_name || "??"}`}</b> (
              <i>{ConferenceToNickname[teamObj.conf] || "??"}</i>)
              <br />
              <span>{teamObj?.year || "????"}</span>
              <br />
              <span>
                <b>
                  {getFieldValue("wins")}-{getFieldValue("losses")}
                </b>{" "}
                (WAB: <b>{getFieldValue("wab")?.toFixed(1) || "??"}</b>)
              </span>
              <br />
              <br />
              <span>
                Adj Margin:{" "}
                <b>
                  {(
                    getFieldValue("off_adj_ppp") - getFieldValue("def_adj_ppp")
                  )?.toFixed(1) || "??"}
                </b>{" "}
                pts/100
                {getRank("adj_net") ? ` (${getRank("adj_net")})` : ""}
              </span>
              <br />
              <span>
                Adj Off:{" "}
                <b>{getFieldValue("off_adj_ppp")?.toFixed(1) || "??"}</b>{" "}
                pts/100
                {getRank("off_adj_ppp") ? ` (${getRank("off_adj_ppp")})` : ""}
              </span>
              <br />
              <span>
                Adj Def:{" "}
                <b>{getFieldValue("def_adj_ppp")?.toFixed(1) || "??"}</b>{" "}
                pts/100
                {getRank("def_adj_ppp") ? ` (${getRank("def_adj_ppp")})` : ""}
              </span>
              <br />
              <br />
              <span>
                (x, y): (<b>{xValue?.toFixed(2) || "??"}</b>,{" "}
                <b>{yValue?.toFixed(2) || "??"}</b>)
              </span>
              <br />
              {(sizeValue !== undefined || colorValue !== undefined) && (
                <span>
                  (size, color): (<b>{sizeValue?.toFixed(2) || "??"}</b>,
                  <b style={{ color: data.colorRgb || "inherit" }}>
                    {colorValue?.toFixed(2) || "??"}
                  </b>
                  )
                </span>
              )}
            </p>
            <p>Click to add to filter in table below.</p>
          </small>
        </div>
      );
    }
    return null;
  };
  // (end chart tooltip)

  // Processing primitives

  /** Handy util to filter teams by conference */
  const confFilter = (t: { team: string; conf: string; year: string }) => {
    const manualFilterInUse = !_.isEmpty(queryFiltersAsMap);
    return manualFilterInUse
      ? year == DateUtils.AllYears || year.startsWith(DateUtils.MultiYearPrefix)
        ? !_.isNil(
            queryFiltersAsMap[t.team] ||
              queryFiltersAsMap[`${t.team}:${t.year}`] ||
              queryFiltersAsMap[`${t.team}:${(t.year || "").substring(0, 4)}`]
          )
        : !_.isNil(queryFiltersAsMap[t.team])
      : confs == "" ||
          confs.indexOf(t.conf) >= 0 ||
          (confs.indexOf(ConfSelectorConstants.highMajorConfsNick) >= 0 &&
            ConfSelectorConstants.powerSixConfsStr.indexOf(t.conf) >= 0) ||
          (confs.indexOf(ConfSelectorConstants.nonHighMajorConfsNick) >= 0 &&
            ConfSelectorConstants.powerSixConfsStr.indexOf(t.conf) < 0);
  };
  /** Builds a list of JSON objects with basic filtering, subsequent phases render */
  const phase1Processing = (teams: any[]) => {
    return _.chain(teams)
      .map((team, teamIndex) => {
        const confNick = ConferenceToNickname[team.conf || ""] || "???";
        const { wab, wae, wins, losses } = _.transform(
          team.opponents || [],
          (acc, game) => {
            const isWin = (game.team_scored || 0) >= (game.oppo_scored || 0);
            acc.wab += isWin ? game.wab || 0 : (game.wab || 0) - 1;
            acc.wae += isWin ? game.wae || 0 : (game.wae || 0) - 1;
            acc.wins += isWin ? 1 : 0;
            acc.losses += isWin ? 0 : 1;
          },
          { wab: 0.0, wae: 0.0, wins: 0, losses: 0 }
        );
        team.conf_nick = confNick;
        team.wab = wab;
        team.wae = wae;
        team.wins = wins;
        team.losses = losses;

        // Bonus step: get the source_id and inject an _id
        team._id = _.find(
          [team.team_name]
            .concat(AvailableTeams.teamAliases[team.team_name] || [])
            .map(
              (teamAlias) => AvailableTeams.byName[teamAlias]?.[0]?.source_id
            ),
          (sourceId) => !_.isEmpty(sourceId)
        );

        // Ugh, so some fields are luck adjusted but we don't want that
        // TODO: longer term provide a "Luck" toggle, though it's not ideal because some stats
        // (eg style) aren't luck adjusted so it will be a little bit inconsistent
        // (note that the fields get overwritten/lost in TeamStatsTableUtils.buildRows below because
        //  adjustForLuck is hard-coded to false but need to do it here so the correct value
        //  is used in the sort/filter and exp. WAB)
        LuckUtils.injectLuck(team, undefined, undefined);

        // this is a bit horrible but this field gets overwritten by some React node for visual
        // purposes, so we re-create it here every time for sorting / filtering / clipboard
        team.off_raw_net = {
          value: (team.off_ppp?.value || 100) - (team.def_ppp?.value || 100),
        };
        if (!team.off_net) {
          //(SECRET_QUERY mode doesn't include this so calculate)
          team.off_net = {
            value:
              (team.off_adj_ppp?.value || 100) -
              (team.def_adj_ppp?.value || 100),
          };
        }

        const expWinPctVsBubble = TeamEvalUtils.calcWinsAbove(
          team.off_adj_ppp?.value || 100,
          team.def_adj_ppp?.value || 100,
          dataEvent.bubbleOffenses[team.year] || fallbackBubbleOffense,
          dataEvent.bubbleDefenses[team.year] || fallbackBubbleDefense,
          0.0
        );
        const expWab = (expWinPctVsBubble - 0.5) * (wins + losses);
        team.exp_wab = expWab;
        team.power = 0.5 * wab + 0.5 * expWab;
        //(to get a proper ranking would need to normalize games played, but this is fine for this power ranking)

        return team;
      })
      .sortBy((team) => {
        if (manualFilterSelected) {
          if (
            year == DateUtils.AllYears ||
            year.startsWith(DateUtils.MultiYearPrefix)
          ) {
            //few different formats
            return (
              queryFiltersAsMap[team.team_name] ||
              queryFiltersAsMap[`${team.team_name}:${team.year}`] ||
              queryFiltersAsMap[
                `${team.team_name}:${(team.year || "").substring(0, 4)}`
              ] ||
              1000
            );
          } else {
            return queryFiltersAsMap[team.team_name] || 1000;
          }
        } else {
          return -(team.power || 0);
        }
      })
      .value();
  };

  const [chart, teamStatsExplorerTable] = React.useMemo(() => {
    if (_.isEmpty(dataEvent.teams)) {
      // If we don't have players we're not done loading yet, so put up a loading screen:
      return [<div style={{ height: "200px" }}></div>, <div></div>];
    } else {
      setLoadingOverride(false);
    }

    const teamObjs = phase1Processing(dataEvent.teams);

    const handleTeamToggle = (teamKey: string) => {
      friendlyChange(
        () => {
          if (teamKey === "") {
            // Clear all selections
            settoggledEntities({});
          } else if (toggledEntities[teamKey]) {
            settoggledEntities(_.omit(toggledEntities, [teamKey]));
          } else {
            settoggledEntities({
              ...toggledEntities,
              [teamKey]: true,
            });
          }
        },
        true,
        250
      ); //(i experimented with making this shorter but it tended not to appear a bit too often)
    };

    // Apply filtering to the data
    const [filteredData, tmpAdvancedFilterError] = datasetFilterStr
      ? AdvancedFilterUtils.applyTeamExplorerFilter(
          teamObjs,
          datasetFilterStr,
          (year: string) =>
            GradeTableUtils.pickDivisonStats(
              divisionStatsCache,
              year,
              gender,
              showGrades
            ),
          {
            x: decompAxis(xAxis).linq,
            y: decompAxis(yAxis).linq,
            z: dotSize,
            color: dotColor,
          }
        )
      : [[], undefined];
    setAdvancedFilterError(tmpAdvancedFilterError);

    const [highlightData, tmpHighlightFilterError] = highlightFilterStr
      ? AdvancedFilterUtils.applyTeamExplorerFilter(
          filteredData,
          highlightFilterStr,
          (year: string) =>
            GradeTableUtils.pickDivisonStats(
              divisionStatsCache,
              year,
              gender,
              showGrades
            ),
          {}
        )
      : [undefined, undefined];
    setHighlightFilterError(tmpHighlightFilterError);

    const labelBuilder = (t: any) =>
      `${t.team_name}${
        year == DateUtils.AllYears || year.startsWith(DateUtils.MultiYearPrefix)
          ? ` '${_.thru(t.year || "??????", (effYear) => {
              return effYear < "2019/20"
                ? "1" + effYear.substring(5)
                : effYear.substring(5);
            })}`
          : ""
      }` || "Unknown team";

    const chartToReturn = (
      <ExplorerChart
        filteredData={filteredData}
        highlightData={highlightData}
        CustomTooltip={CustomTooltip}
        xAxis={xAxis}
        yAxis={yAxis}
        dotColor={dotColor}
        dotSize={dotSize}
        dotColorMap={dotColorMap}
        labelStrategy={labelStrategy}
        pointMarkerType={pointMarkerType}
        labelBuilder={labelBuilder}
        confFilter={
          _.isEmpty(confs) && !hasCustomFilter
            ? undefined
            : (t) => {
                return confFilter({
                  team: t.team_name,
                  conf: t.conf_nick || "???",
                  year: t.year || "????",
                });
              }
        }
        axisPresets={axisPresets}
        colorMapOptions={colorMapOptions}
        contrastForegroundBuilder={contrastForegroundBuilder}
        screenHeight={screenHeight}
        screenWidth={screenWidth}
        height={height}
        toggledEntities={toggledEntities}
        onEntityToggle={handleTeamToggle}
        entityType="team"
      />
    );

    // Build chart data for leaderboard table
    const dataIsAlreadySorted =
      datasetFilterStr.includes("SORT_BY") ||
      highlightFilterStr.includes("SORT_BY");

    const subChartData =
      _.isEmpty(confs) && !highlightData
        ? undefined
        : _.chain(highlightData || filteredData)
            .filter((team) => {
              return confFilter({
                team: team.team_name,
                conf: team.conf_nick || "???",
                year: team.year || "????",
              });
            })
            .value();

    const teamStatsExplorerTableToReturn = (
      <TeamStatsExplorerTable
        startingState={{
          ...startingState,
          maxTableSize: startingState.maxTableSize ?? "10",
          sortBy: "power", //(should improve this logic)
          year: year,
        }}
        dataEvent={{
          teams: (subChartData || filteredData).filter((t) => {
            return _.isEmpty(toggledEntities) || !showOnlyHandSelectedInTable
              ? true
              : toggledEntities[labelBuilder(t)] || false;
          }),
          confs: dataEvent?.confs || [],
          bubbleOffenses: dataEvent?.bubbleOffenses || {},
          bubbleDefenses: dataEvent?.bubbleDefenses || {},
          lastUpdated: dataEvent?.lastUpdated || 0,
          error: dataEvent?.error,
          syntheticData: true,
        }}
        onChangeState={(newParams: TeamStatsExplorerParams) => {
          // Update any relevant params if needed
          onChangeState({
            ...startingState,
            ...newParams,
          });
        }}
      />
    );

    return [chartToReturn, teamStatsExplorerTableToReturn];
  }, [
    confs,
    dataEvent,
    divisionStatsCache,
    queryFilters,
    height,
    datasetFilterStr,
    highlightFilterStr,
    xAxis,
    yAxis,
    dotSize,
    dotColor,
    dotColorMap,
    labelStrategy,
    pointMarkerType,
    screenHeight,
    screenWidth,
    toggledEntities,
    showOnlyHandSelectedInTable,
    resolvedTheme,
  ]);

  // 3] View

  // Advanced filter text

  /** Sticks an overlay on top of the table if no query has ever been loaded */
  function needToLoadQuery() {
    return loadingOverride || _.size(dataEvent.teams) == 0;
  }

  /** Copy to clipboard button */
  const getCopyLinkButton = () => {
    const tooltip = (
      <Tooltip id="copyLinkTooltip">Copies URL to clipboard</Tooltip>
    );
    return (
      <OverlayTrigger placement="auto" overlay={tooltip}>
        <Button
          className="float-left"
          id={`copyLink_playerSeasonComparison`}
          variant="outline-secondary"
          size="sm"
        >
          <FontAwesomeIcon icon={faLink} />
        </Button>
      </OverlayTrigger>
    );
  };

  function stringToOption(s: string) {
    return { label: s, value: s };
  }

  // Overall presets

  // Color selector

  // Label strategy

  // Chart config container callbacks
  const handleFilterChange = (newVal: string) => {
    friendlyChange(() => setAdvancedFilterStr(newVal), true);
  };

  const handleHighlightChange = (newVal: string) => {
    friendlyChange(() => setHighlightFilterStr(newVal), true);
  };

  const handleXAxisChange = (newVal: string) => {
    friendlyChange(() => setXAxis(newVal), true);
  };

  const handleYAxisChange = (newVal: string) => {
    friendlyChange(() => setYAxis(newVal), true);
  };

  const handleDotColorChange = (newVal: string) => {
    friendlyChange(() => setDotColor(newVal), true);
  };

  const handleDotSizeChange = (newVal: string) => {
    friendlyChange(() => setDotSize(newVal), true);
  };

  const handleLabelStrategyChange = (name: string) => {
    friendlyChange(() => {
      setLabelStrategy(name);
    }, true);
  };

  const handleDotColorMapChange = (newColorMap: string) => {
    friendlyChange(() => {
      setDotColorMap(newColorMap);
    }, newColorMap != dotColorMap);
  };

  const handlePointMarkerTypeChange = (type: string) => {
    friendlyChange(() => {
      setPointMarkerType(type);
    }, type != pointMarkerType);
  };

  return (
    <>
      <Container className="medium_screen">
        <Form.Row>
          <Col xs={6} sm={6} md={6} lg={2} style={{ zIndex: 12 }}>
            <ThemedSelect
              value={stringToOption(gender)}
              options={["Men", "Women"].map((gender) => stringToOption(gender))}
              isSearchable={false}
              onChange={(option: any) => {
                if ((option as any)?.value) {
                  const maybeGender = (option as any)?.value;
                  friendlyChange(
                    () => setGender(maybeGender),
                    maybeGender != gender
                  );
                }
              }}
            />
          </Col>
          <Col
            xs={6}
            sm={6}
            md={6}
            lg={year.startsWith(DateUtils.MultiYearPrefix) ? 3 : 2}
            style={{ zIndex: 11 }}
          >
            <YearSelector
              yearOptions={DateUtils.coreYears.concat(DateUtils.AllYears)}
              selectedYear={year}
              onYearChange={(newYear) => {
                friendlyChange(() => {
                  setYear(newYear);
                  const currYearExact = _.startsWith(year, "2");
                  const newYearExact = _.startsWith(newYear, "2");
                  if (currYearExact != newYearExact) {
                    settoggledEntities({});
                  }
                }, newYear != year);
              }}
              allowMultiYear={true}
            />
          </Col>
          <Col className="w-100" bsPrefix="d-lg-none d-md-none" />
          <Col
            xs={11}
            sm={11}
            md={11}
            lg={year.startsWith(DateUtils.MultiYearPrefix) ? 4 : 5}
            style={{ zIndex: 10 }}
          >
            <ConferenceSelector
              emptyLabel={
                year < DateUtils.yearFromWhichAllMenD1Imported
                  ? `All High Tier Teams`
                  : `All Teams`
              }
              confStr={confs}
              confs={dataEvent.confs}
              onChangeConf={(confStr) =>
                friendlyChange(() => {
                  setConfs(confStr);
                  setTmpQueryFilters("");
                  setQueryFilters("");
                }, confs != confStr)
              }
            />
          </Col>
          <Form.Group as={Col} xs={1} className="mt-1">
            {getCopyLinkButton()}
          </Form.Group>
          <Form.Group as={Col} xs={6} sm={6} md={6} lg={2} className="mt-2">
            <Form.Check
              className="float-left"
              type="switch"
              id="configOptions"
              checked={!showConfigOptions}
              onChange={() => {
                const isCurrentlySet = showConfigOptions;
                setShowConfigOptions(!showConfigOptions);
              }}
              label="Hide Config"
            />
            <PageAnnotationSystem className="float-right" />
          </Form.Group>
        </Form.Row>
        {hasCustomFilter ? (
          <Form.Row className="mb-2">
            <Col xs={12} sm={12} md={8} lg={8}>
              <InputGroup className="flex-nowrap">
                <InputGroup.Prepend>
                  <InputGroup.Text id="filter">Filter:</InputGroup.Text>
                </InputGroup.Prepend>
                <div className="flex-fill">
                  <TeamFilterAutoSuggestText
                    readOnly={false}
                    placeholder={`;-separated list of teams"`}
                    autocomplete={teamList
                      .concat([separatorKeyword])
                      .map((s) => s + ";")}
                    value={tmpQueryFilters}
                    onChange={(ev: any) => setTmpQueryFilters(ev.target.value)}
                    onSelectionChanged={(newStr: string) =>
                      friendlyChange(() => {
                        setQueryFilters(newStr);
                      }, newStr != queryFilters)
                    }
                    onKeyUp={(ev: any) => setTmpQueryFilters(ev.target.value)}
                  />
                </div>
              </InputGroup>
            </Col>
          </Form.Row>
        ) : null}
      </Container>
      <ChartConfigContainer
        title={title}
        onTitleChange={setTitle}
        chartPresets={overallTeamChartPresets}
        onApplyPreset={applyPresetChart}
        onClearPreset={() => {
          applyPresetChart({});
        }}
        showConfigOptions={showConfigOptions}
        filterValue={datasetFilterStr}
        filterError={datasetFilterError}
        filterPlaceholder="Enter Linq: remove non-matching teams (see presets for ideas - just type 'ALL' to get all teams)"
        filterPresets={datasetFilterPresets}
        onFilterChange={handleFilterChange}
        highlightValue={highlightFilterStr}
        highlightError={highlightFilterError}
        highlightPlaceholder="Enter Linq: non-matching teams from 'Filter' are faded into the background"
        highlightPresets={datasetFilterPresets}
        onHighlightChange={handleHighlightChange}
        labelStrategy={labelStrategy}
        onLabelStrategyChange={handleLabelStrategyChange}
        pointMarkerType={pointMarkerType}
        onPointMarkerTypeChange={handlePointMarkerTypeChange}
        xAxis={xAxis}
        yAxis={yAxis}
        onXAxisChange={handleXAxisChange}
        onYAxisChange={handleYAxisChange}
        axisPresets={axisPresets}
        dotColor={dotColor}
        onDotColorChange={handleDotColorChange}
        dotColorMap={dotColorMap}
        colorMapOptions={colorMapOptions}
        onDotColorMapChange={handleDotColorMapChange}
        contrastForegroundBuilder={contrastForegroundBuilder}
        dotSize={dotSize}
        onDotSizeChange={handleDotSizeChange}
        autocompleteOptions={AdvancedFilterUtils.teamExplorerAutocomplete}
        showHelp={showHelp}
      />
      <Container className="medium_screen">
        <Row>
          <Col>
            {(xAxis && yAxis) || loadingOverride ? (
              <LoadingOverlay
                active={needToLoadQuery()}
                spinner
                text={"Loading Team Stats Explorer Chart..."}
                styles={{
                  overlay: (base: any) => ({
                    ...base,
                    zIndex: 2000,
                  }),
                }}
              >
                {chart}
              </LoadingOverlay>
            ) : (
              <LoadingOverlay
                active={true}
                text={`Configure chart or select a preset from "Chart Title"`}
              >
                {chart}
              </LoadingOverlay>
            )}
          </Col>
        </Row>
        <Row>
          <Col style={{ paddingLeft: "5px", paddingRight: "5px" }}>
            <GenericCollapsibleCard
              screenSize="medium_screen"
              minimizeMargin={true}
              title="Team Stats"
              helpLink={undefined}
              startClosed={!showTable}
              onShowHide={(nowShown: boolean) => setShowTable(nowShown)}
            >
              <Container className="medium_screen">
                <Row>
                  <Form.Group as={Col} className="mt-2">
                    <Form.Check
                      className="float-left"
                      type="switch"
                      id="showOnlyHandSelectedInTable"
                      disabled={_.isEmpty(toggledEntities)}
                      checked={showOnlyHandSelectedInTable}
                      onChange={() => {
                        friendlyChange(
                          () =>
                            setShowOnlyHandSelectedInTable(
                              !showOnlyHandSelectedInTable
                            ),
                          true
                        );
                      }}
                      label="Show only hand-selected teams"
                    />
                  </Form.Group>
                </Row>
                <Row>{teamStatsExplorerTable}</Row>
              </Container>
            </GenericCollapsibleCard>
          </Col>
        </Row>
      </Container>
    </>
  );
};
export default TeamStatsExplorerChart;
