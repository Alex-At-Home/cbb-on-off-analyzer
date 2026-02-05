import _ from "lodash";

/**
 * Parameterized Painless script that calculates weighted stat contribution.
 * Used in sum aggregations - much cheaper than scripted_metric.
 *
 * weight = overlap / duration_mins
 * where overlap = min(end_min, bin_end) - max(start_min, bin_start)
 */
const weightedSumScript = `
  def startMin = doc["start_min"].value;
  def endMin = doc["end_min"].value;
  def durationMins = doc["duration_mins"].value;
  def overlap = Math.min(endMin, params.bin_end) - Math.max(startMin, params.bin_start);
  def weight = durationMins > 0 ? overlap / durationMins : 0.0;
  
  def statVal = 0.0;
  if (doc.containsKey(params.stat_path) && doc[params.stat_path].size() > 0) {
    statVal = doc[params.stat_path].value;
  }
  return weight * statVal;
`;

/**
 * Builds a sum aggregation with weighted script.
 * Much more efficient than scripted_metric for simple weighted sums.
 */
export const weightedSumAggregation = (
  statPath: string,
  binStart: number,
  binEnd: number
) => {
  return {
    sum: {
      script: {
        source: weightedSumScript,
        lang: "painless",
        params: {
          bin_start: binStart * 1.0,
          bin_end: binEnd * 1.0,
          stat_path: statPath,
        },
      },
    },
  };
};

/**
 * Player stat paths - these are the stats we aggregate per player.
 * Structure in player_events docs: player_stats.fg.made.total, etc.
 */
const playerStatPaths = {
  // Core stats
  num_possessions: "num_possessions",
  pts: "pts",
  // Counting stats
  to: "to.total",
  assist: "assist.total",
  stl: "stl.total",
  blk: "blk.total",
  foul: "foul.total",
  orb: "orb.total",
  drb: "drb.total",
  // Shot stats - 2p
  fg_2p_made: "fg_2p.made.total",
  fg_2p_attempts: "fg_2p.attempts.total",
  // Shot stats - 3p
  fg_3p_made: "fg_3p.made.total",
  fg_3p_attempts: "fg_3p.attempts.total",
  // Shot stats - rim
  fg_rim_made: "fg_rim.made.total",
  fg_rim_attempts: "fg_rim.attempts.total",
  // Shot stats - mid
  fg_mid_made: "fg_mid.made.total",
  fg_mid_attempts: "fg_mid.attempts.total",
  // Shot stats - FT
  ft_made: "ft.made.total",
  ft_attempts: "ft.attempts.total",
  // FG totals
  fg_made: "fg.made.total",
  fg_attempts: "fg.attempts.total",
};

/**
 * Team stat paths needed for player usage calculations.
 * From LineupStintsChart: num_possessions and plus_minus
 */
const teamStatPathsForPlayers = {
  team_num_possessions: "team_stats.num_possessions",
  team_plus_minus: "team_stats.plus_minus",
};

/**
 * Builds weighted aggregations for player stats for a specific time bin.
 * Wraps player stats in a terms aggregation by player code.
 * Source: player_events docs with player_stats.X structure.
 */
export const timeBinPlayerAggregations = (
  binStart: number,
  binEnd: number
) => {
  // Player's individual stats
  const playerStatAggs = _.fromPairs(
    Object.entries(playerStatPaths).map(([statName, statPath]) => {
      const fullPath = `player_stats.${statPath}`;
      return [statName, weightedSumAggregation(fullPath, binStart, binEnd)];
    })
  );

  // Team stats for when this player was on court (for usage calc)
  const teamStatAggs = _.fromPairs(
    Object.entries(teamStatPathsForPlayers).map(([statName, statPath]) => {
      return [statName, weightedSumAggregation(statPath, binStart, binEnd)];
    })
  );

  return {
    players: {
      terms: {
        field: "player.code.keyword",
        size: 50,
      },
      aggregations: {
        ...playerStatAggs,
        ...teamStatAggs,
      },
    },
  };
};

/**
 * Team stat paths for team-level aggregations.
 * Source: lineup stint docs with team_stats.X and opponent_stats.X structure.
 */
const teamStatPaths = {
  num_possessions: "num_possessions",
  pts: "pts",
  plus_minus: "plus_minus",
  // Counting stats
  to: "to.total",
  assist: "assist.total",
  stl: "stl.total",
  blk: "blk.total",
  foul: "foul.total",
  orb: "orb.total",
  drb: "drb.total",
  // Shot stats
  fg_2p_made: "fg_2p.made.total",
  fg_2p_attempts: "fg_2p.attempts.total",
  fg_3p_made: "fg_3p.made.total",
  fg_3p_attempts: "fg_3p.attempts.total",
  fg_rim_made: "fg_rim.made.total",
  fg_rim_attempts: "fg_rim.attempts.total",
  fg_mid_made: "fg_mid.made.total",
  fg_mid_attempts: "fg_mid.attempts.total",
  ft_made: "ft.made.total",
  ft_attempts: "ft.attempts.total",
  fg_made: "fg.made.total",
  fg_attempts: "fg.attempts.total",
};

/**
 * Builds weighted aggregations for team stats for a specific time bin.
 * Source: lineup stint docs.
 */
export const timeBinTeamAggregations = (
  srcPrefix: "team_stats" | "opponent_stats",
  dstPrefix: "off" | "def",
  binStart: number,
  binEnd: number
) => {
  return _.fromPairs(
    Object.entries(teamStatPaths).map(([statName, statPath]) => {
      const fullPath = `${srcPrefix}.${statPath}`;
      return [
        `${dstPrefix}_${statName}`,
        weightedSumAggregation(fullPath, binStart, binEnd),
      ];
    })
  );
};

/**
 * Builds the complete time bin aggregation structure.
 * Creates a filter aggregation per bin with weighted team and player stats.
 */
export const timeBinAggregations = (numBins: number = 40) => {
  return _.fromPairs(
    _.range(numBins).map((binStart) => {
      const binEnd = binStart + 1;
      const binFilter = {
        bool: {
          must: [
            { range: { start_min: { lt: binEnd } } },
            { range: { end_min: { gt: binStart } } },
          ],
        },
      };

      return [
        `bin_${binStart}`,
        {
          filter: binFilter,
          aggregations: {
            // Team-level weighted stats (off = team_stats, def = opponent_stats)
            ...timeBinTeamAggregations("team_stats", "off", binStart, binEnd),
            ...timeBinTeamAggregations("opponent_stats", "def", binStart, binEnd),
            // Player-level weighted stats
            ...timeBinPlayerAggregations(binStart, binEnd),
          },
        },
      ];
    })
  );
};
