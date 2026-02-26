/**
 * Shared logic for impact breakdown total row: P% weighting and /G possession
 * differential. Used by PlayerImpactBreakdownTable and SeasonMatchupImpactUtils.
 */
import _ from "lodash";

/** Data column keys used when summing rows into a total (production set only). */
export const IMPACT_DECOMP_DATA_COL_KEYS: string[] = [
  "off_adj_rapm",
  "def_adj_rapm",
  "off_sos_bonus",
  "off_gravity_bonus",
  "off_net_3p",
  "off_net_mid",
  "off_net_rim",
  "off_net_ft",
  "off_net_ast",
  "off_net_to",
  "off_net_orb",
  "def_sos_bonus",
  "def_gravity_bonus",
];

export type ImpactTotalRowCell = { value: number; extraInfo?: string };

/**
 * Build total row from player/impact rows with same key shape. Applies P%
 * weighting when scaleType === "P%" and possession-differential adjustment
 * when scaleType === "/G" and possPerGame off != def. Caller adds title.
 */
export function buildTotalRow(
  rows: Record<string, { value: number } | unknown>[],
  possPerGame: [number, number] | undefined,
  avgEff: number,
  scaleType: "P%" | "T%" | "/G",
): Record<string, ImpactTotalRowCell> {
  const weightByPoss = scaleType === "P%";

  const total: Record<string, ImpactTotalRowCell> = {};
  const totalOffTeamPossPct = weightByPoss
    ? _.sumBy(
        rows,
        (r) => (r.off_team_poss_pct as { value?: number })?.value ?? 0,
      )
    : 1.0;
  const totalDefTeamPossPct = weightByPoss
    ? _.sumBy(
        rows,
        (r) => (r.def_team_poss_pct as { value?: number })?.value ?? 0,
      )
    : 1.0;

  for (const key of IMPACT_DECOMP_DATA_COL_KEYS) {
    const { sum, sumSq } = _.transform(
      rows,
      (acc, r) => {
        const v = r[key];
        const valToSum =
          typeof v === "object" &&
          v !== null &&
          v !== undefined &&
          "value" in (v as object)
            ? (v as { value: number }).value
            : 0;
        if (weightByPoss) {
          const weightToUse = key.startsWith("off_")
            ? ((r.off_team_poss_pct as { value?: number })?.value ?? 0)
            : ((r.def_team_poss_pct as { value?: number })?.value ?? 0);
          acc.sum += 5 * valToSum * weightToUse;
          acc.sumSq += 5 * valToSum * valToSum * weightToUse;
        } else {
          acc.sum += valToSum;
          acc.sumSq += valToSum * valToSum;
        }
      },
      { sum: 0, sumSq: 0 },
    );
    const totalWeightToUse = key.startsWith("off_")
      ? totalOffTeamPossPct
      : totalDefTeamPossPct;
    if (key == "off_gravity_bonus" || key == "def_gravity_bonus") {
      total[key] = {
        value: weightByPoss
          ? Math.sqrt((0.2 * sumSq) / (totalWeightToUse || 1))
          : Math.sqrt(sumSq / (_.size(rows) || 1)),
        extraInfo: `RMS of gravity, mean is [${(sum / (totalWeightToUse || 1)).toFixed(1)}], should be close to 0`,
      };
    } else {
      total[key] = { value: sum / (totalWeightToUse || 1) };
    }
  }

  if (scaleType === "/G" && possPerGame && possPerGame[0] !== possPerGame[1]) {
    const [offPoss, defPoss] = possPerGame;
    const possDelta = (offPoss - defPoss) * 100;
    const keyToAdjust = possDelta > 0 ? "def_adj_rapm" : "off_adj_rapm";
    const deltaPts = (offPoss - defPoss) * avgEff;
    total[keyToAdjust] = {
      ...total[keyToAdjust],
      value: (total[keyToAdjust]?.value ?? 0) + deltaPts,
      extraInfo: `Off-Def possession delta of [${possDelta.toFixed(1)}]: adjust by [${deltaPts.toFixed(1)}]pts: equivalent to a TO for the team with fewer possessions`,
    };
  }

  total["diff_adj_rapm"] = {
    value:
      (total["off_adj_rapm"]?.value ?? 0) + (total["def_adj_rapm"]?.value ?? 0),
  };

  return total;
}
