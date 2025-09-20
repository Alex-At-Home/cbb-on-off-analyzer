import { PlayerSimilarityUtils } from "../stats/PlayerSimilarityUtils";

export const playerSimilarityQuery = function (inputQueryVector: number[]) {
  return {
    query: {
      script_score: {
        query: {
          term: {
            sample_name: {
              value: `all`,
            },
          },
        },
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
  };
};
