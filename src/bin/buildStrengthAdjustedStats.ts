////////////////////////////////////////////////////////////////
// buildStrengthAdjustedStats.ts
//
// Reads all 3 tier team_details files for a year/gender, concatenates
// team lists (each team has full-season stats), runs iterative
// strength-of-schedule adjustment (KenPom-style) for efg, 3p, 2pmid, 2prim,
// with HCA (home court advantage) per stat estimated as a term in the
// iterative equation (so unbalanced home/away schedules don't bias it).
// Writes d1_adj_stats_all_${gender}_${season}.json.
//
// Usage: node .next/server/buildStrengthAdjustedStats.js --year=2025 --gender=Men
// (Run "npm run dev" first to compile, or use ts-node.)
//
// Phase 1: weights use off_poss/def_poss only (no per-game attempt fields).

import { promises as fs } from "fs";
import _ from "lodash";
import { BatchMiscUtils } from "../utils/batch/BatchMiscUtils";
import { dataLastUpdated } from "../utils/internal-data/dataLastUpdated";

const TIERS = ["High", "Medium", "Low"] as const;
const STRENGTH_ADJUSTED_FIELDS = ["efg", "3p", "2pmid", "2prim"] as const;
const MAX_ITERATIONS = 100;
const TOLERANCE = 1e-6;

type Tier = (typeof TIERS)[number];

/** Team as in team_details (subset we need) */
type TeamDetail = {
  team_name: string;
  conf: string;
  gender?: string;
  year?: string;
  opponents?: Array<{
    oppo_name: string;
    off_poss: number;
    def_poss: number;
    location_type?: "Home" | "Away" | "Neutral";
    team_scored?: number;
    oppo_scored?: number;
  }>;
  [key: string]: any;
};

/** Get numeric value for a stat (handles { value: number } or number) */
function getStatValue(team: TeamDetail, key: string): number | undefined {
  const v = team[key];
  if (v == null) return undefined;
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (
    typeof v === "object" &&
    typeof (v as { value?: number }).value === "number"
  )
    return (v as { value: number }).value;
  return undefined;
}

/** Off/def keys for a field (e.g. "efg" -> off_efg, def_efg) */
function fieldKeys(field: string): { off: string; def: string } {
  return { off: `off_${field}`, def: `def_${field}` };
}

/** Home/away/neutral possession splits for one team (from opponents: our off_poss/def_poss by location) */
type PossessionSplits = {
  home_off_poss: number;
  away_off_poss: number;
  neutral_off_poss: number;
  total_off_poss: number;
  home_def_poss: number;
  away_def_poss: number;
  neutral_def_poss: number;
  total_def_poss: number;
};

function computePossessionSplits(team: TeamDetail): PossessionSplits {
  let home_off = 0,
    away_off = 0,
    neutral_off = 0,
    home_def = 0,
    away_def = 0,
    neutral_def = 0;
  for (const opp of team.opponents ?? []) {
    const offPoss = opp.off_poss ?? 0;
    const defPoss = opp.def_poss ?? 0;
    const loc = opp.location_type ?? "Neutral";
    if (loc === "Home") {
      home_off += offPoss;
      home_def += defPoss;
    } else if (loc === "Away") {
      away_off += offPoss;
      away_def += defPoss;
    } else {
      neutral_off += offPoss;
      neutral_def += defPoss;
    }
  }
  return {
    home_off_poss: home_off,
    away_off_poss: away_off,
    neutral_off_poss: neutral_off,
    total_off_poss: home_off + away_off + neutral_off,
    home_def_poss: home_def,
    away_def_poss: away_def,
    neutral_def_poss: neutral_def,
    total_def_poss: home_def + away_def + neutral_def,
  };
}

/** League averages per field from teams (skip missing) */
function computeLeagueAverages(
  teams: TeamDetail[],
  fields: readonly string[],
): Record<string, { league_off: number; league_def: number }> {
  const out: Record<string, { league_off: number; league_def: number }> = {};
  for (const field of fields) {
    const { off, def } = fieldKeys(field);
    const offVals = teams
      .map((t) => getStatValue(t, off))
      .filter((v): v is number => v != null);
    const defVals = teams
      .map((t) => getStatValue(t, def))
      .filter((v): v is number => v != null);
    out[field] = {
      league_off: offVals.length ? _.sum(offVals) / offVals.length : 0,
      league_def: defVals.length ? _.sum(defVals) / defVals.length : 0,
    };
  }
  return out;
}

/** Phase 1: weight is always off_poss or def_poss. Skip games where opponent missing or weight 0. */
function computeOpponentStrengths(
  team: TeamDetail,
  teamByName: Map<string, TeamDetail>,
  fields: readonly string[],
  adjValues: Map<string, Record<string, { off: number; def: number }>>,
): Record<string, { avg_opp_def: number; avg_opp_off: number }> {
  const opponents = team.opponents || [];
  const result: Record<string, { avg_opp_def: number; avg_opp_off: number }> =
    {};

  for (const field of fields) {
    const { off: offKey, def: defKey } = fieldKeys(field);
    const teamAdj = adjValues.get(team.team_name);
    let sumOffWeight = 0;
    let sumDefWeight = 0;
    let weightedOppDef = 0;
    let weightedOppOff = 0;

    for (const opp of opponents) {
      const oppTeam = teamByName.get(opp.oppo_name);
      if (!oppTeam) continue; // skip game if opponent not in list
      const offPoss = opp.off_poss ?? 0;
      const defPoss = opp.def_poss ?? 0;
      if (offPoss <= 0 && defPoss <= 0) continue;

      const oppAdj = adjValues.get(opp.oppo_name);
      const oppDefX = oppAdj?.def ?? getStatValue(oppTeam, defKey);
      const oppOffX = oppAdj?.off ?? getStatValue(oppTeam, offKey);
      if (oppDefX == null || oppOffX == null) continue;

      if (offPoss > 0 && typeof oppDefX === "number") {
        weightedOppDef += offPoss * oppDefX;
        sumOffWeight += offPoss;
      }
      if (defPoss > 0 && typeof oppOffX === "number") {
        weightedOppOff += defPoss * oppOffX;
        sumDefWeight += defPoss;
      }
    }

    const avg_opp_def =
      sumOffWeight > 0 ? weightedOppDef / sumOffWeight : undefined;
    const avg_opp_off =
      sumDefWeight > 0 ? weightedOppOff / sumDefWeight : undefined;
    result[field] = {
      avg_opp_def: avg_opp_def ?? 0,
      avg_opp_off: avg_opp_off ?? 0,
    };
  }
  return result;
}

const IMBALANCE_MIN = 1e-6; // avoid div by zero when estimating HCA

/**
 * Iterative strength adjustment with HCA per stat as a term in the equation.
 * Model: raw_off_A = adj_off_A * (avg_opp_def/league_def) + hca_off_X * (home_off - away_off)/total_off,
 * so we estimate neutral adj and league-wide hca_off_X, hca_def_X jointly (avoids bias from unbalanced home/away schedules).
 */
function runIterativeAdjustmentWithHCA(
  teams: TeamDetail[],
  teamByName: Map<string, TeamDetail>,
  fields: readonly string[],
  leagueAverages: Record<string, { league_off: number; league_def: number }>,
  possSplits: Map<string, PossessionSplits>,
): {
  adjValues: Map<string, Record<string, { off: number; def: number }>>;
  hcaPerField: Record<string, { hca_off: number; hca_def: number }>;
} {
  const adjValues = new Map<
    string,
    Record<string, { off: number; def: number }>
  >();
  const hcaPerField: Record<string, { hca_off: number; hca_def: number }> = {};

  for (const t of teams) {
    const raw: Record<string, { off: number; def: number }> = {};
    for (const field of fields) {
      const { off, def } = fieldKeys(field);
      raw[field] = {
        off: getStatValue(t, off) ?? 0,
        def: getStatValue(t, def) ?? 0,
      };
    }
    adjValues.set(t.team_name, _.cloneDeep(raw));
  }
  for (const field of fields) {
    hcaPerField[field] = { hca_off: 0, hca_def: 0 };
  }

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    const next = new Map<
      string,
      Record<string, { off: number; def: number }>
    >();
    let maxChange = 0;

    for (const team of teams) {
      const strengths = computeOpponentStrengths(
        team,
        teamByName,
        fields,
        adjValues,
      );
      const splits = possSplits.get(team.team_name) ?? {
        home_off_poss: 0,
        away_off_poss: 0,
        neutral_off_poss: 0,
        total_off_poss: 0,
        home_def_poss: 0,
        away_def_poss: 0,
        neutral_def_poss: 0,
        total_def_poss: 0,
      };
      const imbalanceOff =
        splits.total_off_poss > 0
          ? (splits.home_off_poss - splits.away_off_poss) /
            splits.total_off_poss
          : 0;
      const imbalanceDef =
        splits.total_def_poss > 0
          ? (splits.home_def_poss - splits.away_def_poss) /
            splits.total_def_poss
          : 0;

      const cur = adjValues.get(team.team_name)!;
      const nextEntry: Record<string, { off: number; def: number }> = {};

      for (const field of fields) {
        const { off: offKey, def: defKey } = fieldKeys(field);
        const rawOff = getStatValue(team, offKey) ?? 0;
        const rawDef = getStatValue(team, defKey) ?? 0;
        const league = leagueAverages[field];
        const s = strengths[field];
        const hca = hcaPerField[field];

        // Neutralize raw by HCA, then strength-adjust: adj = (raw - hca*imbalance) * (league/avg_opp)
        let adjOff = rawOff - hca.hca_off * imbalanceOff;
        let adjDef = rawDef - hca.hca_def * imbalanceDef;
        if (s.avg_opp_def > 0 && league.league_def > 0) {
          adjOff *= league.league_def / s.avg_opp_def;
        }
        if (s.avg_opp_off > 0 && league.league_off > 0) {
          adjDef *= s.avg_opp_off / league.league_off;
        }

        nextEntry[field] = { off: adjOff, def: adjDef };
        maxChange = Math.max(
          maxChange,
          Math.abs(adjOff - cur[field].off),
          Math.abs(adjDef - cur[field].def),
        );
      }
      next.set(team.team_name, nextEntry);
    }

    next.forEach((v, name) => adjValues.set(name, v));

    // Re-estimate HCA per field: raw = adj*(avg_opp/league) + hca*imbalance => hca = (raw - pred)/imbalance per team; weighted avg by |imbalance|
    for (const field of fields) {
      let sumOffNum = 0,
        sumOffDen = 0,
        sumDefNum = 0,
        sumDefDen = 0;
      for (const team of teams) {
        const splits = possSplits.get(team.team_name)!;
        const imbalanceOff =
          splits.total_off_poss > 0
            ? (splits.home_off_poss - splits.away_off_poss) /
              splits.total_off_poss
            : 0;
        const imbalanceDef =
          splits.total_def_poss > 0
            ? (splits.home_def_poss - splits.away_def_poss) /
              splits.total_def_poss
            : 0;

        const rawOff = getStatValue(team, fieldKeys(field).off) ?? 0;
        const rawDef = getStatValue(team, fieldKeys(field).def) ?? 0;
        const adj = adjValues.get(team.team_name)!;
        const s = computeOpponentStrengths(team, teamByName, fields, adjValues)[
          field
        ];
        const league = leagueAverages[field];

        const predOff =
          s.avg_opp_def > 0 && league.league_def > 0
            ? adj[field].off * (s.avg_opp_def / league.league_def)
            : rawOff;
        const predDef =
          s.avg_opp_off > 0 && league.league_off > 0
            ? adj[field].def * (league.league_off / s.avg_opp_off)
            : rawDef;

        if (Math.abs(imbalanceOff) >= IMBALANCE_MIN) {
          const hcaContribOff = (rawOff - predOff) / imbalanceOff;
          sumOffNum += hcaContribOff * Math.abs(imbalanceOff);
          sumOffDen += Math.abs(imbalanceOff);
        }
        if (Math.abs(imbalanceDef) >= IMBALANCE_MIN) {
          const hcaContribDef = (rawDef - predDef) / imbalanceDef;
          sumDefNum += hcaContribDef * Math.abs(imbalanceDef);
          sumDefDen += Math.abs(imbalanceDef);
        }
      }
      hcaPerField[field].hca_off = sumOffDen > 0 ? sumOffNum / sumOffDen : 0;
      hcaPerField[field].hca_def = sumDefDen > 0 ? sumDefNum / sumDefDen : 0;
    }

    if (maxChange < TOLERANCE) break;
  }

  return { adjValues, hcaPerField };
}

async function main(): Promise<void> {
  const commandLine = process?.argv ?? [];
  const inGender =
    (
      commandLine.find((p) => p.startsWith("--gender=")) ?? "--gender=Men"
    ).split("=")[1] ?? "Men";
  const inYear =
    (commandLine.find((p) => p.startsWith("--year=")) ?? "").split("=")[1] ??
    "";
  if (!inYear) {
    console.error(
      "Usage: node buildStrengthAdjustedStats.js --year=2025 --gender=Men",
    );
    process.exit(1);
  }
  const yearShort = inYear.substring(0, 4);
  const rootFilePath = "./public/leaderboards/lineups";

  console.log(`Reading tier files for ${inGender} ${yearShort}...`);
  const teamByName = new Map<string, TeamDetail>();

  for (const tier of TIERS) {
    const path = `${rootFilePath}/team_details_all_${inGender}_${yearShort}_${tier}.json`;
    let raw: string;
    try {
      raw = await fs.readFile(path, "utf-8");
    } catch (e) {
      console.error(`Missing tier file: ${path}`);
      process.exit(1);
    }
    const data = JSON.parse(raw) as { teams?: TeamDetail[] };
    const teams = data.teams ?? [];
    for (const t of teams) {
      if (!teamByName.has(t.team_name)) {
        teamByName.set(t.team_name, t);
      }
    }
  }

  const teams = Array.from(teamByName.values());
  console.log(`Loaded ${teams.length} teams.`);

  const possSplits = new Map<string, PossessionSplits>();
  for (const t of teams) {
    possSplits.set(t.team_name, computePossessionSplits(t));
  }

  const leagueAverages = computeLeagueAverages(teams, STRENGTH_ADJUSTED_FIELDS);
  const { adjValues, hcaPerField } = runIterativeAdjustmentWithHCA(
    teams,
    teamByName,
    STRENGTH_ADJUSTED_FIELDS,
    leagueAverages,
    possSplits,
  );

  const averages: Record<string, any> = {};
  for (const field of STRENGTH_ADJUSTED_FIELDS) {
    const league = leagueAverages[field];
    const hca = hcaPerField[field];
    averages[field] = {
      league_off: league.league_off,
      league_def: league.league_def,
      hca_off: hca.hca_off,
      hca_def: hca.hca_def,
    };
  }

  const outTeams = teams.map((t) => {
    const raw: Record<string, { off: number; def: number }> = {};
    const adj: Record<string, { off: number; def: number }> = {};
    const adj_hca: Record<string, { off: number; def: number }> = {};
    const adjValuesForTeam = adjValues.get(t.team_name) ?? {};
    for (const field of STRENGTH_ADJUSTED_FIELDS) {
      const { off, def } = fieldKeys(field);
      raw[field] = {
        off: getStatValue(t, off) ?? 0,
        def: getStatValue(t, def) ?? 0,
      };
      adj[field] = adjValuesForTeam[field] ?? raw[field];
      const hca = hcaPerField[field];
      adj_hca[field] = {
        off: (adjValuesForTeam[field]?.off ?? raw[field].off) + hca.hca_off,
        def: (adjValuesForTeam[field]?.def ?? raw[field].def) - hca.hca_def,
      };
    }
    return {
      team_name: t.team_name,
      conf: t.conf ?? "",
      raw,
      adj,
      adj_hca,
    };
  });

  const lastUpdated =
    (dataLastUpdated as Record<string, number>)[`${inGender}_${inYear}`] ??
    (dataLastUpdated as Record<string, number>)[inYear] ??
    Date.now();

  const output = {
    lastUpdated,
    gender: inGender,
    year: inYear,
    averages,
    teams: outTeams,
  };

  const outPath = `${rootFilePath}/d1_adj_stats_all_${inGender}_${yearShort}.json`;
  const replacer = (key: string, value: unknown): unknown => {
    if (typeof value === "number" && !Number.isFinite(value)) return null;
    return BatchMiscUtils.reduceNumberSize(key, value);
  };
  const jsonStr = JSON.stringify(output, replacer as any);
  await fs.writeFile(outPath, jsonStr);
  console.log(`Wrote ${outTeams.length} teams to ${outPath}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
