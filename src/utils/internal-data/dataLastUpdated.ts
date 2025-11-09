/** The date when the data for the given year was last updated - will clear local caching */
export const dataLastUpdated: Record<string, number> = {
  //Update by executing ./get-epoch-time.sh
  "Men_2014/5": 1428624018,
  "Men_2015/6": 1458864012,
  "Men_2016/7": 1491782417,
  "Men_2017/8": 1523318417,
  "Men_2018/9": 1554854428,
  "Women_2018/9": 1554854428,
  "Men_2019/20": 1583968724,
  "Women_2019/20": 1583968724,
  "Men_2020/21": 1617682995,
  "Women_2020/21": 1617682996,
  "Men_2021/22": 1649491207,
  "Women_2021/22": 1649491206,
  "Men_2022/23": 1681074056,
  "Women_2022/23": 1681074056,
  "Men_2023/24": 1712741334,
  "Women_2023/24": 1712741334,
  "Men_2024/25": 1744303077,
  "Women_2024/25": 1744303077,
  "Men_2025/26": parseInt(process.env.MEN_CURR_UPDATE || "0"),
  "Women_2025/26": parseInt(process.env.WOMEN_CURR_UPDATE || "0"),
};
