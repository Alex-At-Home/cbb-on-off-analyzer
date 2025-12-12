// Lodash:
import _ from "lodash";

export type AxisDecomposition = {
  linq: string;
  label?: string;
  limits?: [string | number, string | number];
  ticks?: (string | number)[];
};

export const decompAxis = (axis: string): AxisDecomposition => {
  const decomp = axis.split("//");
  const postAxis = _.drop(decomp, 1);
  return {
    linq: decomp[0],
    label: _.filter(postAxis, (l) => _.startsWith(l, "LABEL ")).map((l) =>
      _.trim(l.substring(6))
    )[0],
    limits: _.filter(postAxis, (l) => _.startsWith(l, "LIMITS ")).map(
      (l) =>
        _.trim(l.substring(7))
          .split(",")
          .map((numOrStr) => {
            const maybeNum = parseFloat(numOrStr);
            return isNaN(maybeNum) ? numOrStr : maybeNum;
          }) as [string | number, string | number]
    )[0],
    ticks: _.filter(postAxis, (l) => _.startsWith(l, "TICKS ")).map((l) =>
      _.trim(l.substring(6))
        .split(",")
        .map((numOrStr) => {
          const maybeNum = parseFloat(numOrStr);
          return isNaN(maybeNum) ? numOrStr : maybeNum;
        })
    )[0],
  };
};
