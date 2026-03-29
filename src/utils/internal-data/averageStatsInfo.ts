// @ts-ignore
import { publicStatsAveragesMen2018_9 } from "../../utils/public-data/publicStatsAveragesMen2018_9";
// @ts-ignore
import { publicStatsAveragesMen2019_20 } from "../../utils/public-data/publicStatsAveragesMen2019_20";
// @ts-ignore
import { publicStatsAveragesMen2020_21 } from "../../utils/public-data/publicStatsAveragesMen2020_21";
// @ts-ignore
import { publicStatsAveragesMen2021_22 } from "../../utils/public-data/publicStatsAveragesMen2021_22";
// @ts-ignore
import { publicStatsAveragesMen2022_23 } from "../../utils/public-data/publicStatsAveragesMen2022_23";
// @ts-ignore
import { publicStatsAveragesMen2023_24 } from "../../utils/public-data/publicStatsAveragesMen2023_24";
// @ts-ignore
import { publicStatsAveragesMen2024_25 } from "../../utils/public-data/publicStatsAveragesMen2024_25";
// @ts-ignore
import { publicStatsAveragesMen2025_26 } from "../../utils/public-data/publicStatsAveragesMen2025_26";
// @ts-ignore
import { publicStatsAveragesWomen2018_9 } from "../../utils/public-data/publicStatsAveragesWomen2018_9";
// @ts-ignore
import { publicStatsAveragesWomen2019_20 } from "../../utils/public-data/publicStatsAveragesWomen2019_20";
// @ts-ignore
import { publicStatsAveragesWomen2020_21 } from "../../utils/public-data/publicStatsAveragesWomen2020_21";
// @ts-ignore
import { publicStatsAveragesWomen2021_22 } from "../../utils/public-data/publicStatsAveragesWomen2021_22";
import { PureStatSet } from "../StatModels";

export const averageStatsInfo: Record<string, PureStatSet> = {
  "Men_2014/5": {},
  "Men_2015/6": {},
  "Men_2016/7": {},
  "Men_2017/8": {},
  "Men_2018/9": publicStatsAveragesMen2018_9,
  "Men_2019/20": publicStatsAveragesMen2019_20,
  "Men_2020/21": publicStatsAveragesMen2020_21,
  "Men_2021/22": publicStatsAveragesMen2021_22,
  "Men_2022/23": publicStatsAveragesMen2022_23,
  "Men_2023/24": publicStatsAveragesMen2023_24,
  "Men_2024/25": publicStatsAveragesMen2024_25,
  "Men_2025/26": publicStatsAveragesMen2025_26,
  "Women_2018/9": publicStatsAveragesWomen2018_9,
  "Women_2019/20": publicStatsAveragesWomen2019_20,
  "Women_2020/21": publicStatsAveragesWomen2020_21,
  "Women_2021/22": publicStatsAveragesWomen2021_22,
  //TODO: women 22+ onwards
};

/** Because I keep forgetting to update it */
export const defaultAverageStatsInfo: Record<string, PureStatSet> = {
  Men: publicStatsAveragesMen2021_22,
  Women: publicStatsAveragesWomen2021_22,
};
