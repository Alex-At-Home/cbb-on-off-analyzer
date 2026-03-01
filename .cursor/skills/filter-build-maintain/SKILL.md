---
name: filter-build-maintain
description: How to build and maintain Filters that use CommonFilter (Season Matchup and Lineup analyzers). Covers buildParamsFromState(includeFilterParams, forQuery), submit logic, and cache keys.
---

# Building and Maintaining Filters (CommonFilter)

Use this skill when adding a new filter page, changing when the Submit button is enabled, or adding params that affect the API vs UI only. Reference implementations: **SeasonMatchupFilter** (`src/components/SeasonMatchupFilter.tsx`) and **LineupFilter** (`src/components/LineupFilter.tsx`).

## How CommonFilter uses `buildParamsFromState`

Every filter that uses **CommonFilter** implements:

```ts
buildParamsFromState(
  includeFilterParams: Boolean,
  forQuery?: Boolean
): [PARAMS, FilterRequestInfo[]]
```

CommonFilter calls this with different flags:

| Call site | includeFilterParams | forQuery | Purpose |
|-----------|---------------------|----------|---------|
| **shouldSubmitBeDisabled()** | `false` | - | Compare current “query” params to last request; if same → disable Submit |
| **requestHandlingLogic** (actual API request) | `false` | `true` (Lineup) | Build the params object sent to the API and used as **cache key** |
| **handleResponse** (after success) | `true` | - | Full state to store in `currState` and pass to parent |
| **onSubmit** (history, validation) | `true` | - | Full state for history and validation |

Rule of thumb:

- **includeFilterParams === false**  
  Return **only** params that affect the backend request (and thus the cache). Omit UI-only fields (e.g. which player is selected, chart on/off, adjust-for-opponent).  
  This keeps:
  1. Submit enabled only when something that actually triggers a new request has changed.
  2. Cache keys from including cosmetic/UI params and creating duplicate cache entries.

- **includeFilterParams === true**  
  Return the full state (query params + UI state) so the UI and URL can stay in sync and `currState` reflects what the user sees.

## SeasonMatchupFilter pattern

- **includeFilterParams true**  
  Full primary request: `teamPlayerParams` + `mergedCommon` + UI fields: `advancedMode`, `presetMode`, `presetGroup`, `adjustForOpponentStrength`, `showChart`.

- **includeFilterParams false**  
  Query-only: `{ ...teamPlayerParams }` (team, year, gender, minRank, maxRank, baseQuery, onQuery, offQuery, otherQueries). No presetGroup, showChart, adjustForOpponentStrength, etc.

So changing “team/player” or chart/adj toggles does **not** enable Submit and does **not** change the cache key; only team/year/gender (and game list) do.

## LineupFilter pattern

- **includeFilterParams false**  
  Builds a minimal request (common + baseQuery, and optionally `aggByPos`). Uses **forQuery** so that:
  - When **forQuery** is false (e.g. deciding if Submit should be enabled), `aggByPos` is included → changing aggregation enables Submit.
  - When **forQuery** is true (actual API request), `aggByPos` can be omitted from the object so it isn’t part of the cache key (aggregation is applied client-side).

So LineupFilter “pretend submit” for aggregation: Submit appears when aggregation changes, but the param can be excluded from the query/cache.

## Checklist for new or updated filters

1. **Query vs UI params**  
   Identify which params affect the API (and cache) vs only the UI. Examples of UI-only: selected player/lineup for display, chart visibility, “adjust for opponent strength” toggle if it’s client-side only.

2. **buildParamsFromState(includeFilterParams, forQuery)**  
   - For `includeFilterParams === false`: return a minimal object with only params that trigger the request / form the cache key. Omit UI-only and cosmetic params.  
   - For `includeFilterParams === true`: return full state (query + UI) for `currState`, URL, and parent.

3. **Optional forQuery**  
   Use only if you need “submit enabled when X changes” but “X not sent in the actual request” (e.g. LineupFilter’s aggregation). Otherwise you can ignore `forQuery`.

4. **Refs for auto-submit**  
   If the filter depends on games/roster loaded by CommonFilter (e.g. Season Matchup), pass **gameSelectionRef** and **rosterRef** from the filter into CommonFilter, and in **buildParamsFromState** (and any response handling) use the refs when local state (e.g. `games`) is still empty so the first request and response use the same game list.

5. **Don’t add one-off Submit logic in CommonFilter**  
   Submit behavior should be driven by “what does buildParamsFromState(false) return?”. Avoid extra flags in CommonFilter (e.g. “submit only when primary params differ”); instead, make the filter’s `buildParamsFromState(false)` return only the params that should drive Submit and caching.

## Related

- **HOW_TO_ADD_NEW_FILTER_PARAMS.md** – Adding a new parameter to filters and URL/history.
- **CommonFilter** – `src/components/CommonFilter.tsx` (submit logic, request, handleResponse).
- **SeasonMatchupFilter** – `src/components/SeasonMatchupFilter.tsx` (query-only vs full state).
- **LineupFilter** – `src/components/LineupFilter.tsx` (includeFilterParams + forQuery for aggregation).
