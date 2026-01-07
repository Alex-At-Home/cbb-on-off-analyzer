# How to Add New Filter Parameters

This guide describes the steps to add a new filter parameter to the cbb-on-off-analyzer codebase.

## Steps

### 1. Add Type to `GameFilterParams` in `src/utils/FilterModels.ts`

Add the new parameter type to the `GameFilterParams` type definition:

```typescript
export type GameFilterParams = {
  // ... existing params ...
  myNewParam?: string; // or boolean, number, etc.
};
```

### 2. Add Default Value in `ParamDefaults` Class

In the same file, add a default value:

```typescript
static readonly defaultMyNewParam = "defaultValue";
```

### 3. Extract from `startingState` in `GameFilter.tsx`

In `src/components/GameFilter.tsx`, destructure the param from `startingState`:

```typescript
const {
  // ... existing extractions ...
  myNewParam: startMyNewParam,
  // ...
} = startingState;
```

### 4. Add to `rebuildFullState()` in `GameFilter.tsx`

Include the param in the returned object:

```typescript
const rebuildFullState = () => {
  return {
    // ... existing params ...
    myNewParam: startMyNewParam,
  };
};
```

### 5. Add State Management in Target Component (e.g., `TeamStatsTable.tsx`)

```typescript
const [myNewParam, setMyNewParam] = useState(
  _.isNil(gameFilterParams.myNewParam)
    ? ParamDefaults.defaultMyNewParam
    : gameFilterParams.myNewParam
);
```

### 6. Add to `useEffect` Dependencies and State Update

In the component's `useEffect` that calls `onChangeState`:

```typescript
useEffect(() => {
  const newState = {
    ...gameFilterParams,
    // ... existing params ...
    myNewParam: myNewParam,
  };
  onChangeState(newState);
}, [
  // ... existing dependencies ...
  myNewParam,
]);
```

### 7. Handle Data Reload (if param triggers new API calls)

If the param requires fetching new data, add a check in `OnOffAnalyzer.tsx` `onGameFilterParamsChange()`:

```typescript
if (params.myNewParam !== gameFilterParamsRef.current?.myNewParam) {
  setShouldForceReload((t) => t + 1);
}
```

### 8. Add to URL Default Omit Clause (if using URL routing)

If the param is saved in the URL, add it to the default omit clause in `OnOffAnalyzer.tsx` (around line 270-350) to keep URLs clean when the param has its default value:

```typescript
rawParams.myNewParam == ParamDefaults.defaultMyNewParam
  ? ["myNewParam"]
  : [],
```

### 9. Add API Request Logic (if needed)

In `GameFilter.tsx` `buildParamsFromState()`, add conditional request logic:

```typescript
const shouldFetchMyData = visualSettingsToUse.myNewParam === "someValue";

// Add to request array:
.concat(
  shouldFetchMyData
    ? [
        {
          tag: "myDataTag",
          context: ParamPrefixes.myPrefix as ParamPrefixesType,
          paramsObj: primaryRequest,
        },
      ]
    : []
)
```

**Note**: If the API uses `tri_filter` (like team/player stats), the response will contain `on`, `off`, `baseline`, and `other_N` buckets. You can either:

- Make a single request and parse each bucket separately in `handleResponse`
- Make separate requests per bucket (like `lineupRequests` pattern)

### 10. Process API Response (if needed)

In `GameFilter.tsx` `handleResponse()`, process the response:

```typescript
const myData = jsonResps?.["myDataTag"]?.responses?.[0] || {};
// Process and include in onStats call
```

**For responses with tri_filter buckets** (on/off/baseline/other), parse each bucket and inject into the corresponding team stats:

```typescript
const myDataResponses = jsonResps?.["myDataTag"]?.responses;
const buildMyData = (bucket: string) => {
  if (!myDataResponses) return undefined;
  return parseMyDataResponse(myDataResponses, bucket);
};

// In onStats call:
{
  on: injectMyData(teamStats.on, buildMyData("on")),
  off: injectMyData(teamStats.off, buildMyData("off")),
  baseline: injectMyData(teamStats.baseline, buildMyData("baseline")),
  other: otherTeamStats.map((s, i) => injectMyData(s, buildMyData(`other_${i}`))),
}
```

## Example: `teamPlayStyleConfig` Parameter

This parameter was added to control offensive/defensive style chart display:

1. **FilterModels.ts**: Added `teamPlayStyleConfig?: string` to `GameFilterParams`
2. **FilterModels.ts**: Added `defaultTeamPlayStyleConfig = "off"` to `ParamDefaults`
3. **GameFilter.tsx**: Extracted `teamPlayStyleConfig: startTeamPlayStyleConfig`
4. **GameFilter.tsx**: Added to `rebuildFullState()`
5. **TeamStatsTable.tsx**: Added state with `useState`
6. **TeamStatsTable.tsx**: Added to `useEffect` and `onChangeState`
7. **OnOffAnalyzer.tsx**: Added reload trigger when "def" is added
8. **OnOffAnalyzer.tsx**: Added to URL default omit clause
9. **GameFilter.tsx**: Added `alsoPullDefensiveStats` logic and request
10. **GameFilter.tsx**: Processed response with `PlayTypeUtils.parseTeamDefenseResponse`

## Notes

- Parameters that don't require new API calls only need steps 1-6
- Parameters that require data refresh need step 7
- Parameters saved in URL need step 8
- Parameters that require new API endpoints need steps 9-10
- Use existing patterns in the codebase as reference
