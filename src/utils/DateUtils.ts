import _ from "lodash";

import { dataLastUpdated } from "./internal-data/dataLastUpdated";

/** Keep all the constants and useful manipulation methods for dates in one place  */
export class DateUtils {
  // Constants

  static readonly AllYears = "All";
  static readonly ExtraYears = "Extra";

  //////////////////////////////////////

  /** Set this to true to show the off-season leaderboard as the site front page */
  static readonly frontPageIsOffseasonLeaderboard: Boolean = false;

  /** During portal mania show the off-season leaderboard with extra in/out metrics */
  static readonly showOffseasonMetrics: Boolean = false;

  /** This year is being written to GCS daily, others are statically part of the website - DO NOT USE OUTSIDE OF THIS CONTEXT */
  static readonly inSeasonYear: string = "2024/25";

  /** During the season, this is the next off-season. During the off-season, this is the _current_ off-season (tbc: June 2023 offseason == 2022/23) */
  static readonly offseasonYear: string = "2024/25";

  /** The years for which I have collected "bulk" data (ie not just hand-picked teams), from men "2020/21", all D1 */
  static readonly coreYears: string[] = [
    "2018/9",
    "2019/20",
    "2020/21",
    "2021/22",
    "2022/23",
    "2023/24",
    "2024/25",
  ];

  /** Note should include all 3 formats $date, Men_$date, Women_$date */
  static readonly seasonNotFinished: Record<string, boolean> = {
    "2023/24": false,
    "Men_2023/24": false,
    "Women_2023/24": false,
    "2024/25": true,
    "Men_2024/25": true,
    "Women_2024/25": true,
  };

  /** Up this once the portal gets active, even if it's before the season ends
   * (can just leave it as the prev year until the portal opens the following year)
   */
  static readonly yearWithActiveTransferPortal: string = "2023/24";

  /** Use pre-season rankings instead of *ALSO* previous season's rankings - do once the pre-season ranks settle down (1st June?)
   * Actually for 23 offseason I'm going to experiment with using both the whole offseason, since it's interesting to
   * see the difference
   */
  static readonly hasPreseasonRankings: Record<string, boolean> = {
    "Men_2022/23": true,
    "Men_2023/24": false, //(see usePreseasonAndLastSeason)
  };

  /** Start showing both pre-season and prev-season - do once the pre-season ranks start to settle down (1st May?) */
  static readonly usePreseasonAndLastSeason: Record<string, boolean> = {
    "Men_2023/24": true,
    "Men_2024/25": true,
  };

  /** The first year for which we had bulk date (ie not just hand-picked) */
  static readonly firstYearWithData = DateUtils.coreYears[0];

  /** Used for defaults for everything but leaderboards (which get updated later) */
  static readonly mostRecentYearWithData: string = "2024/25";

  /** The year to use if making off-season predictions
   * To update for the following year in-season: up this, and fix getPrevYear
   * Also don't forget to ensure "transfer_${prev_season}.json" is copied from GCS to public/leaderboards/roster_movement
   *
   */
  static readonly offseasonPredictionYear: string = "2024/25";

  /** Used for leaderboard defaults, which lags behind (player + lineups, currently teams but that might change later) */
  static readonly mostRecentYearWithLboardData: string = "2024/25";

  /** Don't bother trying to display NET after this year */
  static readonly mostRecentYearWithNetAvailable: string = "2023/24";

  /** Can't do team leaderboard predictions before here (per-team projections are fine because it's easy to edit them) */
  static readonly firstYearWithDecentRosterData: string = "2021/22";

  /** Can't display shot charts before here */
  static readonly firstYearWithShotChartData: string = "2023/24";

  /** Don't have player geo before here */
  static readonly firstYearWithRosterGeoData: string = "2023/24"; //"2023/24";

  // These are old years in which the normal rules don't apply:

  /** The final year in which a player/lineup/team might coem from the "Extra" bucket */
  static readonly lastExtraYear: string = "2017/8";

  /** Don't want to use current year for test logic, so pick a recent previous year - changing this will need all the test artefacts to be changed */
  static readonly yearToUseForTests: string = "2020/21";

  /** Can use (year < yearFromWhichAllMenD1Imported) to identify years with only the T100 or so seasons */
  static readonly yearFromWhichAllMenD1Imported: string = "2020/21";

  /** Eg estimated possession counts are smaller this season */
  static readonly covidSeason: string = "2020/21";

  //////////////////////////////////////

  // Methods

  /** All years supported by the leaderboard - with handy flags to control extra options */
  private static readonly lboardYearListOptions = (
    withNextYear: boolean,
    withAll: boolean,
    withExtra: boolean
  ) =>
    DateUtils.coreYears
      .filter((y) => y <= DateUtils.mostRecentYearWithLboardData)
      .concat(
        withNextYear &&
          DateUtils.offseasonPredictionYear >
            DateUtils.mostRecentYearWithLboardData
          ? [DateUtils.offseasonPredictionYear]
          : []
      )
      .concat(withAll ? ["All"] : [])
      .concat(withExtra ? ["Extra"] : []);

  /** For team editing, we can go into the offseason (unless in "what-if" mode), but can't have the first season because
   * then we'd have no history to use for projections
   */
  static readonly teamEditorYears = (offseasonMode: boolean) =>
    offseasonMode
      ? _.drop(DateUtils.lboardYearListOptions(true, false, false), 1) //(include off-season but not very first year)
      : DateUtils.lboardYearListOptions(false, false, false); //(include all seasons for which we have data)

  /** All years supported by the leaderboard - plus sometimes "Extra" but never "All" ... TODO: figure out why?! */
  static readonly lboardYearListWithNextYear = (withExtra: boolean) =>
    DateUtils.lboardYearListOptions(true, false, withExtra);

  /** All years selectable by the leaderboard year dropdown */
  static readonly lboardYearList = (tier: string) => {
    const tierIsHighOrAll = tier == "High" || tier == "All";
    return DateUtils.lboardYearListOptions(false, true, tierIsHighOrAll) //(always show all)
      .filter(
        (y) =>
          tierIsHighOrAll ||
          y == "All" ||
          y >= DateUtils.yearFromWhichAllMenD1Imported
      );
  };

  /** All years supported by the leaderboard (with Extra but not All) */
  static readonly lboardYearListWithExtra = DateUtils.lboardYearListOptions(
    false,
    false,
    true
  );

  /** Is the season ongoing */
  static readonly isSeasonFinished = (year: string) =>
    !(DateUtils.seasonNotFinished[year] || false);

  /** Approx 20d before the end of the actual season (genderYear format is `${gender}_${year}`) */
  static readonly getEndOfRegSeason = (genderYear: string) =>
    DateUtils.seasonNotFinished[genderYear]
      ? undefined
      : dataLastUpdated[genderYear]! - 20 * 24 * 3600;

  /** Get the previous season */
  static readonly getPrevYear = (y: string) => {
    if (y == "2024/25") {
      return "2023/24";
    } else if (y == "2023/24") {
      return "2022/23";
    } else if (y == "2022/23") {
      return "2021/22";
    } else if (y == "2021/22") {
      //TODO: From 2020/21 onwards can calculate
      return "2020/21";
    } else if (y == "2020/21") {
      return "2019/20";
    } else if (y == "2019/20") {
      return "2018/9";
    } else {
      // older, we'll show the historical data I've pulled
      return "Extra";
    }
  };
  /** Get the next season */
  static readonly getNextYear = (y: string) => {
    if (y == "2023/24") {
      return "2024/25";
    } else if (y == "2022/23") {
      return "2023/24";
    } else if (y == "2021/22") {
      return "2022/23";
    } else if (y == "2020/21") {
      //TODO: From 2020/21 onwards can calculate
      return "2021/22";
    } else if (y == "2019/20") {
      return "2020/21";
    } else if (y == "2018/9") {
      return "2019/20";
    } else if (y == "Extra") {
      return "2018/9";
    } else {
      return "None";
    }
  };
  /** Next season if we have data for it else  */
  static readonly getLastSeasonWithDataFrom = (y: string) => {
    return y > DateUtils.mostRecentYearWithData || y == DateUtils.AllYears
      ? DateUtils.mostRecentYearWithData
      : y;
  };

  /** Get the offseason of the current season */
  static readonly getOffseasonOfYear = (y: string) => {
    if (y == "2024/25") {
      //TODO: can calculate programmatically
      return "2025";
    } else if (y == "2023/24") {
      return "2024";
    } else if (y == "2022/23") {
      return "2023";
    } else if (y == "2021/22") {
      return "2022";
    } else if (y == "2020/21") {
      return "2021";
    } else if (y == "2019/20") {
      return "2020";
    } else {
      return undefined;
    }
  };

  /** If we have per-player shot info in lineups then use luck-adjusted lineups in offensive RAPM, else don't */
  static readonly lineupsHavePlayerShotInfo = (gy: string) => {
    if ("Men_2021/22" == gy || "Men_2014/5" == gy) {
      return true;
    } else {
      return false;
    }
  };
}
