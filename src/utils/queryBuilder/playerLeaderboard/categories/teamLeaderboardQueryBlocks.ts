import { AdvancedFilterUtils } from "../../../AdvancedFilterUtils";
import { humanizePlayerLinqField } from "../humanize";
import { LEADERBOARD_TEAM_STATS_RAW_PREFIX } from "../../leaderboardTeamFieldPrefixes";
import type { PlayerQueryBlock } from "../types";

const rowTeam = (rawField: string) => ({
  linq: `${LEADERBOARD_TEAM_STATS_RAW_PREFIX}${rawField}`,
  label: humanizePlayerLinqField(rawField),
});

const teamExplorerGraded = AdvancedFilterUtils.teamExplorerGradedStats;
const isPlayStyleField = (f: string) => f.includes("_style_");
const gradedNonStyle = teamExplorerGraded.filter((f) => !isPlayStyleField(f));

const coreGraded: string[] = [];
const scrambleGraded: string[] = [];
const transitionGraded: string[] = [];
for (const f of gradedNonStyle) {
  if (f.includes("_scramble_")) {
    scrambleGraded.push(f);
  } else if (f.includes("_trans_")) {
    transitionGraded.push(f);
  } else {
    coreGraded.push(f);
  }
}

/** Team metadata (same tokens as `teamExplorerMetadata`), prefixed for player-leaderboard LINQ. */
export const teamQueryMetadataBlocks: PlayerQueryBlock[] = [
  {
    id: "team_basic_metadata",
    title: "Basic metadata",
    includeRankPctile: false,
    fields: [
      "_id",
      "team_name",
      "conf",
      "conf_nick",
      "year",
      "wins",
      "losses",
    ].map(rowTeam),
  },
  {
    id: "team_advanced_metadata",
    title: "Advanced metadata",
    includeRankPctile: false,
    fields: ["wab", "wae", "exp_wab", "power"].map(rowTeam),
  },
];

/** Team graded stats (non–play-style), with rank/pctile slices where `teamFieldHasRank` allows. */
export const teamQueryGradedStatBlocks: PlayerQueryBlock[] = [
  {
    id: "team_graded_core",
    title: "Efficiency, factors, and shooting",
    includeRankPctile: true,
    fields: coreGraded.map(rowTeam),
  },
  {
    id: "team_graded_scramble",
    title: "Scramble stats",
    includeRankPctile: true,
    fields: scrambleGraded.map(rowTeam),
  },
  {
    id: "team_graded_transition",
    title: "Transition stats",
    includeRankPctile: true,
    fields: transitionGraded.map(rowTeam),
  },
];

const teamStyleFields = teamExplorerGraded.filter(isPlayStyleField);
const teamOffStyles = teamStyleFields.filter((f) => f.startsWith("off_"));
const teamDefStyles = teamStyleFields.filter((f) => f.startsWith("def_"));

/** Offensive play-style mix on the team object (`team_stats.off_style_*`). */
export const teamQueryOffPlayStyleBlock: PlayerQueryBlock = {
  id: "team_offensive_play_styles",
  title: "Offensive play styles",
  includeRankPctile: true,
  fields: teamOffStyles.map(rowTeam),
};

/** Defensive play-style mix on the team object (`team_stats.def_style_*`). */
export const teamQueryDefPlayStyleBlock: PlayerQueryBlock = {
  id: "team_defensive_play_styles",
  title: "Defensive play styles",
  includeRankPctile: true,
  fields: teamDefStyles.map(rowTeam),
};

export const allTeamLeaderboardQueryBlocks: PlayerQueryBlock[] = [
  ...teamQueryMetadataBlocks,
  ...teamQueryGradedStatBlocks,
  teamQueryOffPlayStyleBlock,
  teamQueryDefPlayStyleBlock,
];
