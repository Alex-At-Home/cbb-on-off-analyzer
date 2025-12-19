// Lodash:
import _ from "lodash";

export type AxisDecomposition = {
  linq: string;
  label?: string;
  limits?: [string | number, string | number];
  ticks?: (string | number)[];
  invert?: boolean;
  quadrantHigh?: string;
  quadrantLow?: string;
  axisColor?: string;
};

export const decompAxis = (axis: string): AxisDecomposition => {
  const decomp = axis.split("//");
  const postAxis = _.drop(decomp, 1);
  return {
    linq: _.trim(decomp[0]),
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
    invert: _.filter(postAxis, (l) => _.startsWith(l, "INVERT ")).map(
      (l) => _.trim(l.substring(7)).toLowerCase() === "true"
    )[0],
    quadrantHigh: _.filter(postAxis, (l) =>
      _.startsWith(l, "QUADRANT_HIGH ")
    ).map((l) => _.trim(l.substring(14)))[0],
    quadrantLow: _.filter(postAxis, (l) =>
      _.startsWith(l, "QUADRANT_LOW ")
    ).map((l) => _.trim(l.substring(13)))[0],
    axisColor: _.filter(postAxis, (l) => _.startsWith(l, "AXIS_COLOR ")).map(
      (l) => _.trim(l.substring(11))
    )[0],
  };
};

export const recompAxis = (decomp: AxisDecomposition): string => {
  let result = _.trim(decomp.linq);

  if (decomp.label) {
    result += ` //LABEL ${decomp.label}`;
  }
  if (decomp.limits) {
    result += ` //LIMITS ${decomp.limits.join(",")}`;
  }
  if (decomp.ticks) {
    result += ` //TICKS ${decomp.ticks.join(",")}`;
  }
  if (decomp.invert) {
    result += ` //INVERT true`;
  }
  if (decomp.quadrantHigh) {
    result += ` //QUADRANT_HIGH ${decomp.quadrantHigh}`;
  }
  if (decomp.quadrantLow) {
    result += ` //QUADRANT_LOW ${decomp.quadrantLow}`;
  }
  if (decomp.axisColor) {
    result += ` //AXIS_COLOR ${decomp.axisColor}`;
  }

  return result;
};
