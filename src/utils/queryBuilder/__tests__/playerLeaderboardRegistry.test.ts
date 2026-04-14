import { AdvancedFilterUtils } from "../../AdvancedFilterUtils";
import {
  allPlayerQueryBlocks,
  playerQueryBuilderFieldNameSet,
} from "../playerLeaderboard";
import { teamQueryBuilderFieldNameSet } from "../teamLeaderboardRegistry";

describe("player leaderboard query builder registry", () => {
  it("exposes only tokens that exist on playerLeaderBoardAutocomplete (excluding operators)", () => {
    const autocomplete = new Set(
      AdvancedFilterUtils.playerLeaderBoardAutocomplete,
    );
    const operators = new Set(AdvancedFilterUtils.operators);
    for (const name of playerQueryBuilderFieldNameSet) {
      expect(autocomplete.has(name)).toBe(true);
      expect(operators.has(name)).toBe(false);
    }
  });

  it("includes at least one graded token", () => {
    expect(playerQueryBuilderFieldNameSet.has("pctile_off_efg")).toBe(true);
    expect(playerQueryBuilderFieldNameSet.has("rank_off_efg")).toBe(true);
  });

  it("has non-empty blocks", () => {
    expect(allPlayerQueryBlocks.length).toBeGreaterThan(3);
  });

  it("team registry tokens exist on playerLboardWithTeamStatsAutocomplete (excluding operators)", () => {
    const autocomplete = new Set(
      AdvancedFilterUtils.playerLboardWithTeamStatsAutocomplete,
    );
    const operators = new Set(AdvancedFilterUtils.operators);
    for (const name of teamQueryBuilderFieldNameSet) {
      expect(autocomplete.has(name)).toBe(true);
      expect(operators.has(name)).toBe(false);
    }
  });
});
