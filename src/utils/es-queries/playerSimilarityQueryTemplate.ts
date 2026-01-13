import { PlayerSimilarityUtils } from "../stats/PlayerSimilarityUtils";

export const playerSimilarityQuery = function (
  inputQueryVector: number[],
  queryPos?: string
) {
  // IMPORTANT: This field list must be kept in sync with buildUnweightedPlayerSimilarityVector!
  // Any changes to similarity calculation fields require updating this list.
  const similarityFields = [
    // Play style fields for all styles (_id is always returned automatically)
    ...PlayerSimilarityUtils.allStyles.flatMap((style) => [
      `style.${style}.possPctUsg.value`,
      `style.${style}.possPct.value`,
      `style.${style}.adj_pts.value`,
      `style.${style}.pts.value`,
    ]),
    // Additional play style stats
    "off_assist.value",
    "off_to.value",
    "off_orb.value",
    "off_ftr.value",
    // FG percentage stats
    "off_3p.value",
    "off_3pr.value",
    "off_2pmid.value",
    "off_2pmidr.value",
    "off_2prim.value",
    "off_2primr.value",
    // Offensive advanced stats
    "off_adj_rapm.value",
    "off_adj_rtg.value",
    "off_usage.value",
    "off_team_poss_pct.value",
    // Defensive stats
    "def_adj_rapm.value",
    "def_rtg.value",
    "def_to.value", //(stl)
    "def_2prim.value", //(blk)
    "def_ftr.value", //(fc/50)
    "def_orb.value",
    "on.def_adj_ppp.value",
    // Player info
    "roster.year_class.keyword",
    "roster.height.keyword",
  ];

  /**/
  if (queryPos && PlayerSimilarityUtils.queryByPosition[queryPos])
    console.log(
      JSON.stringify({
        terms: {
          posClass: PlayerSimilarityUtils.queryByPosition[queryPos] || [],
        },
      })
    );

  const queryByPos = queryPos
    ? PlayerSimilarityUtils.queryByPosition[queryPos]
    : undefined;

  const baseQuery = {
    term: {
      sample_name: {
        value: `all`,
      },
    },
  };

  const query = queryByPos
    ? {
        bool: {
          must: [
            {
              terms: {
                "posClass.keyword": queryByPos || [],
              },
            },
            baseQuery,
          ],
        },
      }
    : baseQuery;

  return {
    query: {
      script_score: {
        query: query,
        script: {
          source: `
            double dot = 0.0;
            double normDoc = 0.0;
            double normQuery = 0.0;

            for (int i = 0; i < params.styles.length; i++) {
              String styleName = params.styles[i];
              String fieldName = "style." + styleName + "." + params.statField + ".value";
              double docVal = 0.0;

              if (doc.containsKey(fieldName) && doc[fieldName].size() > 0) {
                docVal = doc[fieldName].value;
              }

              double queryVal = params.queryVector[i];

              // decide weight based on membership in the sets
              double weight = 1.0;
              if (params.lowFreqStyles != null && params.lowFreqStyles.contains(styleName)) {
                weight = params.lowFreqWeight;
              } else if (params.medFreqStyles != null && params.medFreqStyles.contains(styleName)) {
                weight = params.medFreqWeight;
              } else {
                weight = params.highFreqWeight;
              }

              // apply the same weight to BOTH doc and query values
              docVal = docVal * weight;
              queryVal = queryVal * weight;

              dot += docVal * queryVal;
              normDoc += docVal * docVal;
              normQuery += queryVal * queryVal;
            }

            if (normDoc == 0 || normQuery == 0) return 0;
            return dot / (Math.sqrt(normDoc) * Math.sqrt(normQuery));
          `,
          params: {
            queryVector: inputQueryVector,
            styles: PlayerSimilarityUtils.allStyles,
            statField: "possPctUsg",
            lowFreqStyles: PlayerSimilarityUtils.lowFreqStyles,
            medFreqStyles: PlayerSimilarityUtils.medFreqStyles,
            // numeric weight constants
            lowFreqWeight: PlayerSimilarityUtils.lowFreqStylesWeight,
            medFreqWeight: PlayerSimilarityUtils.medFreqStylesWeight,
            highFreqWeight: 1.0,
          },
        },
      },
    },
    // Use docvalue_fields for performance - only return fields needed for similarity calculation
    docvalue_fields: similarityFields,
    // Don't return _source to save bandwidth
    _source: false,
  };
};
