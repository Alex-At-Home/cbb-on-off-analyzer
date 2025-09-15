export const playerSimilarityQuery = function (inputQueryVector: number[]) {
  const styles = [
    "Rim Attack",
    "Attack & Kick",
    "Dribble Jumper",
    "Mid-Range",
    "Backdoor Cut",
    "Big Cut & Roll",
    "Post-Up",
    "Post & Kick",
    "Pick & Pop",
    "High-Low",
    "Put-Back",
    "Transition",
    "Perimeter Sniper",
    "Hits Cutter",
    "PnR Passer",
  ];

  // your specified sets (only include styles that actually appear in `styles`)
  const lowFreqStyles = [
    "Pick & Pop",
    "High-Low",
    "Backdoor Cut",
    "Hits Cutter",
    "PnR Passer",
    // "Inside Out" omitted here because it's not in `styles` list above
  ];
  const medFreqStyles = [
    "Put-Back",
    "Post-Up",
    "Big Cut & Roll",
    "Mid-Range",
    "Dribble Jumper",
    "Perimeter Sniper",
    "Attack & Kick",
  ];

  return {
    query: {
      script_score: {
        query: { match_all: {} },
        script: {
          source: `
            double dot = 0.0;
            double normDoc = 0.0;
            double normQuery = 0.0;

            for (int i = 0; i < params.styles.length; i++) {
              String styleName = params.styles[i];
              String fieldName = "style." + styleName + "." + params.statField;
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
            styles,
            statField: "possPctUsg",
            lowFreqStyles,
            medFreqStyles,
            // numeric weight constants
            lowFreqWeight: 3.0,
            medFreqWeight: 1.5,
            highFreqWeight: 1.0,
          },
        },
      },
    },
  };
};
