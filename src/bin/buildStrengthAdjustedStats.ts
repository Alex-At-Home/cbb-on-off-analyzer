////////////////////////////////////////////////////////////////
// buildStrengthAdjustedStats.ts
//
// Reads all 3 tier team_details files from ./enrichedPlayers for a year/gender,
// concatenates team lists, runs KenPom-style per-game strength-of-schedule
// adjustment for efg, 3p, 2pmid, 2prim (using per-game raw and field-specific
// weights from opponent rows). Derives HCA per stat from residuals. Writes
// d1_adj_stats_all_${gender}_${season}.json to enrichedPlayers.
//
// Usage: node .next/server/buildStrengthAdjustedStats.js --year=2025 --gender=Men
//        --debug=TeamName   (optional: human-readable calculation details for that team)
//
// Requires per-game fields in each opponent row: off_2pmid_attempts,
// off_2prim_attempts, off_3p_attempts, off_2pmid_made, off_2prim_made, off_3p_made,
// and def_* equivalents; falls back to off_poss/def_poss for weight when missing.

import { promises as fs } from "fs";
import _ from "lodash";
import { BatchMiscUtils } from "../utils/batch/BatchMiscUtils";
import { dataLastUpdated } from "../utils/internal-data/dataLastUpdated";

const TIERS = ["High", "Medium", "Low"] as const;
const STRENGTH_ADJUSTED_FIELDS = ["efg", "3p", "2pmid", "2prim"];
const MAX_ITERATIONS = 100;
const TOLERANCE = 1e-6;
const IMBALANCE_MIN = 1e-6;

type Tier = (typeof TIERS)[number];

/** One opponent row = one game (with optional per-game shot/attempt fields) */
type OpponentGame = {
  oppo_name: string;
  off_poss: number;
  def_poss: number;
  location_type?: "Home" | "Away" | "Neutral";
  team_scored?: number;
  oppo_scored?: number;
  off_2pmid_attempts?: number;
  off_2prim_attempts?: number;
  off_3p_attempts?: number;
  off_2pmid_made?: number;
  off_2prim_made?: number;
  off_3p_made?: number;
  def_2pmid_attempts?: number;
  def_2prim_attempts?: number;
  def_3p_attempts?: number;
  def_2pmid_made?: number;
  def_2prim_made?: number;
  def_3p_made?: number;
  [key: string]: any;
};

/** Team as in team_details (subset we need) */
type TeamDetail = {
  team_name: string;
  conf: string;
  gender?: string;
  year?: string;
  opponents?: OpponentGame[];
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

/** Per-game raw rate from opponent row. efg = (2pmid+2prim+1.5*3p)_made / FGA; 3p/2pmid/2prim = made/attempts. */
function getPerGameRaw(
  opp: OpponentGame,
  field: string,
  side: "off" | "def",
): number | undefined {
  const pre = side === "off" ? "off_" : "def_";
  if (field === "efg") {
    const a2m =
      (opp[`${pre}2pmid_attempts`] ?? 0) +
      (opp[`${pre}2prim_attempts`] ?? 0) +
      (opp[`${pre}3p_attempts`] ?? 0);
    if (a2m <= 0) return undefined;
    const made =
      (opp[`${pre}2pmid_made`] ?? 0) +
      (opp[`${pre}2prim_made`] ?? 0) +
      1.5 * (opp[`${pre}3p_made`] ?? 0);
    return made / a2m;
  }
  if (field === "3p") {
    const a = opp[`${pre}3p_attempts`] ?? 0;
    if (a <= 0) return undefined;
    return (opp[`${pre}3p_made`] ?? 0) / a;
  }
  if (field === "2pmid") {
    const a = opp[`${pre}2pmid_attempts`] ?? 0;
    if (a <= 0) return undefined;
    return (opp[`${pre}2pmid_made`] ?? 0) / a;
  }
  if (field === "2prim") {
    const a = opp[`${pre}2prim_attempts`] ?? 0;
    if (a <= 0) return undefined;
    return (opp[`${pre}2prim_made`] ?? 0) / a;
  }
  return undefined;
}

/** Weight for this game/field/side: FGA for efg, 3PA for 3p, 2pmid_attempts for 2pmid, 2prim_attempts for 2prim; fallback off_poss/def_poss. */
function getGameWeight(
  opp: OpponentGame,
  field: string,
  side: "off" | "def",
): number {
  const pre = side === "off" ? "off_" : "def_";
  let w = 0;
  if (field === "efg") {
    w =
      (opp[`${pre}2pmid_attempts`] ?? 0) +
      (opp[`${pre}2prim_attempts`] ?? 0) +
      (opp[`${pre}3p_attempts`] ?? 0);
  } else if (field === "3p") {
    w = opp[`${pre}3p_attempts`] ?? 0;
  } else if (field === "2pmid") {
    w = opp[`${pre}2pmid_attempts`] ?? 0;
  } else if (field === "2prim") {
    w = opp[`${pre}2prim_attempts`] ?? 0;
  }
  if (w > 0) return w;
  return side === "off" ? (opp.off_poss ?? 0) : (opp.def_poss ?? 0);
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

/** League averages per field from per-game data (weighted by game weight) */
function computeLeagueAveragesFromPerGame(
  teams: TeamDetail[],
  fields: readonly string[],
): Record<string, { league_off: number; league_def: number }> {
  const out: Record<string, { league_off: number; league_def: number }> = {};
  for (const field of fields) {
    let sumOffW = 0,
      sumOffWx = 0,
      sumDefW = 0,
      sumDefWx = 0;
    for (const t of teams) {
      for (const opp of t.opponents ?? []) {
        const rawOff = getPerGameRaw(opp, field, "off");
        const rawDef = getPerGameRaw(opp, field, "def");
        const wOff = getGameWeight(opp, field, "off");
        const wDef = getGameWeight(opp, field, "def");
        if (rawOff != null && wOff > 0) {
          sumOffW += wOff;
          sumOffWx += wOff * rawOff;
        }
        if (rawDef != null && wDef > 0) {
          sumDefW += wDef;
          sumDefWx += wDef * rawDef;
        }
      }
    }
    out[field] = {
      league_off: sumOffW > 0 ? sumOffWx / sumOffW : 0,
      league_def: sumDefW > 0 ? sumDefWx / sumDefW : 0,
    };
  }
  return out;
}

/** Team-level raw for a field as weighted average of per-game raw (from opponent rows). */
function getTeamRawFromPerGame(
  team: TeamDetail,
  field: string,
): { off: number; def: number } {
  let sumOffW = 0,
    sumOffWx = 0,
    sumDefW = 0,
    sumDefWx = 0;
  for (const opp of team.opponents ?? []) {
    const rawOff = getPerGameRaw(opp, field, "off");
    const rawDef = getPerGameRaw(opp, field, "def");
    const wOff = getGameWeight(opp, field, "off");
    const wDef = getGameWeight(opp, field, "def");
    if (rawOff != null && wOff > 0) {
      sumOffW += wOff;
      sumOffWx += wOff * rawOff;
    }
    if (rawDef != null && wDef > 0) {
      sumDefW += wDef;
      sumDefWx += wDef * rawDef;
    }
  }
  return {
    off: sumOffW > 0 ? sumOffWx / sumOffW : 0,
    def: sumDefW > 0 ? sumDefWx / sumDefW : 0,
  };
}

/** Field-specific weights (getGameWeight). Skip games where opponent missing or weight 0. */
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
    let sumOffWeight = 0;
    let sumDefWeight = 0;
    let weightedOppDef = 0;
    let weightedOppOff = 0;

    for (const opp of opponents) {
      const oppTeam = teamByName.get(opp.oppo_name);
      if (!oppTeam) continue;
      const wOff = getGameWeight(opp, field, "off");
      const wDef = getGameWeight(opp, field, "def");
      if (wOff <= 0 && wDef <= 0) continue;

      const oppAdj = adjValues.get(opp.oppo_name);
      const oppDefX =
        oppAdj?.[field]?.def ?? getTeamRawFromPerGame(oppTeam, field).def;
      const oppOffX =
        oppAdj?.[field]?.off ?? getTeamRawFromPerGame(oppTeam, field).off;

      if (wOff > 0 && typeof oppDefX === "number") {
        weightedOppDef += wOff * oppDefX;
        sumOffWeight += wOff;
      }
      if (wDef > 0 && typeof oppOffX === "number") {
        weightedOppOff += wDef * oppOffX;
        sumDefWeight += wDef;
      }
    }

    result[field] = {
      avg_opp_def: sumOffWeight > 0 ? weightedOppDef / sumOffWeight : 0,
      avg_opp_off: sumDefWeight > 0 ? weightedOppOff / sumDefWeight : 0,
    };
  }
  return result;
}

/**
 * KenPom-style per-game adjustment: Adj_game = Raw_game * (league / (OppAdj ± HCA)),
 * then team Adj = weighted average of per-game adjusted. HCA re-estimated from
 * residuals: hca = (raw - pred)/imbalance weighted by |imbalance|.
 */
function runIterativeAdjustmentWithHCA(
  teams: TeamDetail[],
  teamByName: Map<string, TeamDetail>,
  fields: readonly string[],
  leagueAverages: Record<string, { league_off: number; league_def: number }>,
  possSplits: Map<string, PossessionSplits>,
  debugTeamName: string | null,
  debugField: string | null,
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
      raw[field] = getTeamRawFromPerGame(t, field);
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
      const cur = adjValues.get(team.team_name)!;
      const nextEntry: Record<string, { off: number; def: number }> = {};
      const debug = debugTeamName && team.team_name === debugTeamName;

      for (const field of fields) {
        const league = leagueAverages[field];
        const hca = hcaPerField[field];
        let sumOffW = 0,
          sumOffWx = 0,
          sumDefW = 0,
          sumDefWx = 0;

        const debugThisField = debug && (!debugField || field === debugField);
        if (debugThisField && iter < 3) {
          console.log(
            `\n--- ${team.team_name} field=${field} iter=${iter} ---`,
          );
        }

        for (const opp of team.opponents ?? []) {
          const oppTeam = teamByName.get(opp.oppo_name);
          const oppAdj = oppTeam ? adjValues.get(opp.oppo_name) : undefined;
          const oppDefX =
            oppAdj?.[field]?.def ??
            (oppTeam ? getTeamRawFromPerGame(oppTeam, field).def : undefined);
          const oppOffX =
            oppAdj?.[field]?.off ??
            (oppTeam ? getTeamRawFromPerGame(oppTeam, field).off : undefined);

          const rawOffG = getPerGameRaw(opp, field, "off");
          const rawDefG = getPerGameRaw(opp, field, "def");
          const wOff = getGameWeight(opp, field, "off");
          const wDef = getGameWeight(opp, field, "def");

          const loc = opp.location_type ?? "Neutral";
          const hcaSignOff = loc === "Away" ? 1 : loc === "Home" ? -1 : 0;
          const hcaSignDef = loc === "Home" ? -1 : loc === "Away" ? 1 : 0;
          const denomOff = (oppDefX ?? 0) + hcaSignOff * hca.hca_off;
          const denomDef = (oppOffX ?? 0) + hcaSignDef * hca.hca_def;

          let adjOffG = rawOffG ?? 0;
          let adjDefG = rawDefG ?? 0;
          if (denomOff > 0 && league.league_def > 0 && rawOffG != null) {
            adjOffG = rawOffG * (league.league_off / denomOff);
          }
          if (denomDef > 0 && league.league_off > 0 && rawDefG != null) {
            adjDefG = rawDefG * (league.league_def / denomDef);
          }

          if (rawOffG != null && wOff > 0) {
            sumOffW += wOff;
            sumOffWx += wOff * adjOffG;
          }
          if (rawDefG != null && wDef > 0) {
            sumDefW += wDef;
            sumDefWx += wDef * adjDefG;
          }

          if (debugThisField && iter < 3) {
            console.log(
              `  opp=${opp.oppo_name} loc=${loc} raw_off=${rawOffG?.toFixed(4)} raw_def=${rawDefG?.toFixed(4)} opp_adj_def=${oppDefX?.toFixed(4)} opp_adj_off=${oppOffX?.toFixed(4)} ±HCA_off=${hcaSignOff * hca.hca_off} ±HCA_def=${hcaSignDef * hca.hca_def} adj_off_g=${adjOffG.toFixed(4)} adj_def_g=${adjDefG.toFixed(4)} w_off=${wOff} w_def=${wDef}`,
            );
          }
        }

        const newOff = sumOffW > 0 ? sumOffWx / sumOffW : cur[field].off;
        const newDef = sumDefW > 0 ? sumDefWx / sumDefW : cur[field].def;
        nextEntry[field] = { off: newOff, def: newDef };
        maxChange = Math.max(
          maxChange,
          Math.abs(newOff - cur[field].off),
          Math.abs(newDef - cur[field].def),
        );
        if (debugThisField && iter < 3) {
          console.log(
            `  => team adj_off=${newOff.toFixed(4)} adj_def=${newDef.toFixed(4)}`,
          );
        }
      }
      next.set(team.team_name, nextEntry);
    }

    next.forEach((v, name) => adjValues.set(name, v));

    // Re-estimate HCA from residuals: raw = adj*(avg_opp/league) + hca*imbalance => hca = (raw - pred)/imbalance, weighted by |imbalance|
    for (const field of fields) {
      let sumOffNum = 0,
        sumOffDen = 0,
        sumDefNum = 0,
        sumDefDen = 0;
      const debugContribs: {
        team: string;
        raw: number;
        pred: number;
        residual: number;
        imbalance: number;
        contrib: number;
      }[] = [];

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

        const rawOff = getTeamRawFromPerGame(team, field).off;
        const rawDef = getTeamRawFromPerGame(team, field).def;
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
          if (debugTeamName && team.team_name === debugTeamName) {
            debugContribs.push({
              team: team.team_name,
              raw: rawOff,
              pred: predOff,
              residual: rawOff - predOff,
              imbalance: imbalanceOff,
              contrib: hcaContribOff,
            });
          }
        }
        if (Math.abs(imbalanceDef) >= IMBALANCE_MIN) {
          const hcaContribDef = (rawDef - predDef) / imbalanceDef;
          sumDefNum += hcaContribDef * Math.abs(imbalanceDef);
          sumDefDen += Math.abs(imbalanceDef);
        }
      }
      const hcaOff = sumOffDen > 0 ? sumOffNum / sumOffDen : 0;
      const hcaDef = sumDefDen > 0 ? sumDefNum / sumDefDen : 0;
      hcaPerField[field].hca_off = hcaOff;
      hcaPerField[field].hca_def = hcaDef;

      if (
        debugTeamName &&
        (!debugField || field === debugField) &&
        debugContribs.length > 0
      ) {
        console.log(
          `\n--- HCA from residuals field=${field} (iter ${iter}) ---`,
        );
        console.log(
          `  Formula: hca = (raw - pred) / imbalance, weighted avg by |imbalance|`,
        );
        debugContribs.forEach((c) => {
          console.log(
            `  ${c.team}: raw=${c.raw.toFixed(4)} pred=${c.pred.toFixed(4)} residual=${c.residual.toFixed(4)} imbalance=${c.imbalance.toFixed(4)} contrib=${c.contrib.toFixed(4)}`,
          );
        });
        console.log(
          `  sumOffNum=${sumOffNum.toFixed(6)} sumOffDen=${sumOffDen.toFixed(6)} => hca_off=${hcaOff.toFixed(6)}`,
        );
        console.log(
          `  sumDefNum=${sumDefNum.toFixed(6)} sumDefDen=${sumDefDen.toFixed(6)} => hca_def=${hcaDef.toFixed(6)}`,
        );
      }
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
  const debugArg = commandLine.find((p) => p.startsWith("--debug="));
  const debugTeamName = debugArg
    ? debugArg.split("=")[1]?.trim() || null
    : null;
  const debugFieldArg = commandLine.find((p) => p.startsWith("--debug_field="));
  let debugField: string | null = debugFieldArg
    ? debugFieldArg.split("=")[1]?.trim() || null
    : null;
  if (
    debugField &&
    !(STRENGTH_ADJUSTED_FIELDS as string[]).includes(debugField)
  ) {
    console.error(
      `Invalid --debug_field=${debugField}; must be one of: ${STRENGTH_ADJUSTED_FIELDS.join(", ")}`,
    );
    process.exit(1);
  }

  if (!inYear) {
    console.error(
      "Usage: node buildStrengthAdjustedStats.js --year=2025 --gender=Men [--debug=TeamName] [--debug_field=efg|3p|2pmid|2prim]",
    );
    process.exit(1);
  }
  const yearShort = inYear.substring(0, 4);
  const rootFilePath = "./enrichedPlayers";

  if (debugTeamName) {
    console.log(
      `Debug: printing calculation details for team "${debugTeamName}" only${debugField ? `, field=${debugField}` : ""}.`,
    );
  }

  console.log(
    `Reading tier files from ${rootFilePath} for ${inGender} ${yearShort}...`,
  );
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

  const leagueAverages = computeLeagueAveragesFromPerGame(
    teams,
    STRENGTH_ADJUSTED_FIELDS,
  );
  const { adjValues, hcaPerField } = runIterativeAdjustmentWithHCA(
    teams,
    teamByName,
    STRENGTH_ADJUSTED_FIELDS,
    leagueAverages,
    possSplits,
    debugTeamName,
    debugField,
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
      raw[field] = getTeamRawFromPerGame(t, field);
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
