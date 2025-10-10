import _ from "lodash";

export const NonP6Nick = "MM";
export const P6Nick = "P6";
export const P5Nick = "P5"; //(ready for 24/25!)

/** Note these use the KenPom naming conventions */
export const ConferenceToNickname: Record<string, string> = {
  "Power 6 Conferences": P6Nick,
  "Outside The P6": NonP6Nick,
  "American Athletic Conference": "AAC",
  "America East Conference": "AE",
  "Atlantic Coast Conference": "ACC",
  "ASUN Conference": "ASUN",
  "Atlantic 10 Conference": "A10",
  "Big East Conference": "BE",
  "Big Sky Conference": "BSKY",
  "Big South Conference": "BSO",
  "Big Ten Conference": "B1G",
  "Big 12 Conference": "B12",
  "Big West Conference": "BW",
  "Colonial Athletic Association": "CAA",
  "Conference USA": "CUSA",
  "Horizon League": "HOR",
  "Ivy League": "IVY",
  "Mid American Conference": "MAC",
  "Metro Atlantic Athletic Conference": "MAAC",
  "Mid-Eastern Athletic Conference": "MEAC",
  "Mountain West Conference": "MWC",
  "Missouri Valley Conference": "MVC",
  "Northeast Conference": "NEC",
  "Ohio Valley Conference": "OVC",
  "Pac 12 Conference": "P12",
  "Patriot League": "PAT",
  "Southeastern Conference": "SEC",
  "Southern Conference": "SOCON",
  "Southland Conference": "SLND",
  "Summit League": "SUM",
  "Sun Belt Conference": "SBLT",
  "Southwestern Athletic Conference": "SWAC",
  "Western Athletic Conference": "WAC",
  "West Coast Conference": "WCC",
};

/** Maps index_template values to conference nicknames */
export const IndexTemplateToNickname: Record<string, string> = {
  "acc": "ACC",
  "americaeast": "AE", 
  "american": "AAC",
  "atlanticsun": "ASUN",
  "atlanticten": "A10",
  "bigeast": "BE",
  "bigsky": "BSKY",
  "bigsouth": "BSO",
  "bigten": "B1G",
  "bigtwelve": "B12",
  "bigwest": "BW",
  "colonial": "CAA",
  "conferenceusa": "CUSA",
  "horizon": "HOR",
  "ivy": "IVY",
  "maac": "MAAC",
  "mac": "MAC",
  "meac": "MEAC",
  "misc_conf": "MISC",
  "mountainwest": "MWC",
  "mvc": "MVC",
  "nec": "NEC",
  "ovc": "OVC",
  "pactwelve": "P12",
  "patriot": "PAT",
  "sec": "SEC",
  "socon": "SOCON",
  "southland": "SLND",
  "summit": "SUM",
  "sunbelt": "SBLT",
  "swac": "SWAC",
  "wac": "WAC",
  "wcc": "WCC",
  // Women's conference variants use same nicknames
  "women_acc": "ACC",
  "women_american": "AAC",
  "women_atlanticten": "A10",
  "women_bigeast": "BE",
  "women_bigten": "B1G",
  "women_bigtwelve": "B12",
  "women_misc_conf": "MISC",
  "women_pactwelve": "P12",
  "women_sec": "SEC",
};

export const HighMajorConfs: Set<String> = new Set([
  "Atlantic Coast Conference",
  "Big 12 Conference",
  "Big East Conference",
  "Big Ten Conference",
  "Pac 10 Conference",
  "Pac 12 Conference",
  "Southeastern Conference",
]);

export const effectivelyHighMajor = new Set([
  "Gonzaga",
  "BYU",
  "Saint Mary's (CA)",
  "Memphis",
  "Wichita St.",
  "UConn",
  "Cincinnati",
  "Houston",
  "Utah St.",
  "Nevada",
]);
export const excludeFromMidMajor = new Set([
  "Gonzaga",
  "Memphis",
  "Wichita St.",
  "UConn",
  "Cincinnati",
]);

export const NicknameToConference: Record<string, string> = _.chain(
  ConferenceToNickname
)
  .toPairs()
  .map((kv) => [kv[1], kv[0]])
  .fromPairs()
  .value();

export const Power6ConferencesNicks = ["B1G", "ACC", "BE", "B12", "P12", "SEC"];
export const Power6Conferences = Power6ConferencesNicks.map(
  (c) => NicknameToConference[c] || c
);

export const NonP6Conferences = _.chain(ConferenceToNickname)
  .flatMap((confNick, conf) =>
    confNick == NonP6Nick || confNick == P6Nick || HighMajorConfs.has(conf)
      ? []
      : [conf]
  )
  .value();

/** high / midhigh / mid / midlow / low doesn't seem quite granular enough in practice, plus  */
export const confAdjustments = {
  horizon: -1, //"mid" seems way too high
};
export const getConfAdjustment = (confStr: string, year: string) => {
  if (confStr == "horizon") {
    return -1; //"mid" seems way too high
  } else if (confStr == "atlanticsun") {
    return +0.5; //"low" seems harsh, has often been better than that
  } else if (confStr == "wac") {
    return +0.5; //"midlow" seems too low, has been mad but also in mid territory often
  } else if (confStr == "americaeast") {
    return +0.5; //"low" seems too low, pretty close to horizon
  } else if (confStr == "socon") {
    return +1.0; //"midlow" - socon have beeen reasonably middle of the road mid major for a while
  } else if (confStr == "maac") {
    return +0.5; //"midlow" - have had some bad years but also decent
  } else if (confStr == "sunbelt") {
    return -0.5; //"mid", one of the weaker mid majors
  } else if (confStr == "ivy") {
    return -0.5; //"mid", one of the weaker mid majors
  } else if (confStr == "bigwest") {
    return -0.5; //"mid", one of the weaker mid majors
  } else if (confStr == "summit") {
    return -0.5; //"mid", one of the weaker mid majors
  }
  return 0;
};

//////////////////////////////////////////////

// CONFERENCE CHANGE LOGIC

/**
 * h/t Jun 2022: https://medium.com/run-it-back-with-zach/conference-realignment-all-the-moves-coming-in-2022-25-130ef706da55
 */
const latestConfChanges_2022 = {
  // Sun Belt
  "James Madison": "Sun Belt Conference", //(CAA)
  Marshall: "Sun Belt Conference", //(C-USA)
  "Old Dominion": "Sun Belt Conference", //(C-USA)
  "Southern Miss.": "Sun Belt Conference", //(C-USA)

  // Atlantic Sun
  "Austin Peay": "ASUN Conference", //(OVC)
  // (Queens from D2)

  // Western Athletic Conference

  "Southern Utah": "Western Athletic Conference", //(bigsky)
  "UT Arlington": "Western Athletic Conference", //(sunbelt)
  // 2023?: "UIW": "Western Athletic Conference", //(southland)

  // Colonial Athletic Association
  Hampton: "Colonial Athletic Association", //(bigsouth)
  Monmouth: "Colonial Athletic Association", //(maac)
  "N.C. A&T": "Colonial Athletic Association", //(bigsouth)
  "Stony Brook": "Colonial Athletic Association", //(americaeast)

  // Atlantic 10 Conference
  "Loyola Chicago": "Atlantic 10 Conference", //(mvc)

  // Ohio Valley Conference
  "Little Rock": "Ohio Valley Conference", //(sunbelt)
  // (Lindenwood, Southern Indiana from D2)

  // Missouri Valley Conference
  Belmont: "Missouri Valley Conference", //(ovc)
  UIC: "Missouri Valley Conference", //(horizon)
  "Murray St.": "Missouri Valley Conference", //(ovc)

  //Metro Atlantic Athletic Conference
  "Mount St. Mary's": "Metro Atlantic Athletic Conference", //(nec)

  // America East Conference
  Bryant: "America East Conference", //(nec)

  // Northeast Conference
  // (Stonehill from D2)
};
/** https://sportsenthusiasts.net/2022/07/02/college-sports-realignment-for-2023-and-beyond/ */
const latestConfChanges_2023 = {
  //AAC
  Charlotte: "American Athletic Conference", //(conferenceusa)
  "Fla. Atlantic": "American Athletic Conference", //(conferenceusa)
  "North Texas": "American Athletic Conference", //(conferenceusa)
  Rice: "American Athletic Conference", //(conferenceusa)
  UAB: "American Athletic Conference", //(conferenceusa)
  UTSA: "American Athletic Conference", //(conferenceusa)

  //B12
  Cincinnati: "Big 12 Conference", //(american)
  Houston: "Big 12 Conference", //(american)
  UCF: "Big 12 Conference", //(american)
  BYU: "Big 12 Conference", //(wcc)

  // Conference USA
  "Jacksonville St.": "Conference USA", //(asun)
  Liberty: "Conference USA", //(asun)
  "New Mexico St.": "Conference USA", //(wac)
  "Sam Houston": "Conference USA", //(wac)

  // CAA
  Campbell: "Colonial Athletic Association", //(big south)

  // Western Athletic Conference

  //Southland
  "Lamar University": "Southland Conference", //(wac - actually were in southland but i missed it)

  // Dropping out of D1:
  Hartford: "NCAA D3",
  "St. Francis Brooklyn": "No NCAA",
};
/** https://en.wikipedia.org/wiki/2021–2024_NCAA_conference_realignment#List_of_FBS_schools_changing_conferences_since_2022 */
const latestConfChanges_2024 = {
  //ACC
  California: "Atlantic Coast Conference", //(pactwelve)
  SMU: "Atlantic Coast Conference", //(american)
  Stanford: "Atlantic Coast Conference", //(pactwelve)

  //BIG
  UCLA: "Big Ten Conference", //(pactwelve)
  "Southern California": "Big Ten Conference", //(pactwelve)
  Oregon: "Big Ten Conference", //(pactwelve)
  Washington: "Big Ten Conference", //(pactwelve)

  //B12
  Arizona: "Big 12 Conference", //(pactwelve)
  "Arizona St.": "Big 12 Conference", //(pactwelve)
  Colorado: "Big 12 Conference", //(pactwelve)
  Utah: "Big 12 Conference", //(pactwelve)

  //SEC
  Oklahoma: "Southeastern Conference", //(bigtwelve)
  Texas: "Southeastern Conference", //(bigtwelve)

  // NEC
  "Chicago St.": "Northeast Conference", // (ind; although I incorrectly had this team as wac)

  // MAAC
  Merrimack: "Metro Atlantic Athletic Conference", // (nec)
  "Sacred Heart": "Metro Atlantic Athletic Conference", // (nec)

  //WCC
  "Oregon St.": "West Coast Conference", //(P12!)
  "Washington St.": "West Coast Conference", //(P12!)

  // Southland
  UTRGV: "Southland Conference", //(wac)

  //Conference USA
  "Kennesaw St.": "Conference USA", //(asun)
};

//https://en.wikipedia.org/wiki/2021–2026_NCAA_conference_realignment#2025
const latestConfChanges_2025 = {
  //Conference USA
  Delaware: "Conference USA", //(caa)
  "Missouri St.": "Conference USA", //(mvc)

  // MAC
  Massachusetts: "Mid American Conference", //(a10)
};

//https://en.wikipedia.org/wiki/2021–2026_NCAA_conference_realignment#2026
const latestConfChanges_2026 = {
  //PAC-12
  "Boise St.": "Pac 12 Conference", //(mwc)
  "Colorado St.": "Pac 12 Conference", //(mwc)
  "Fresno St.": "Pac 12 Conference", //(mwc)
  "San Diego St.": "Pac 12 Conference", //(mwc)
  "Utah St.": "Pac 12 Conference", //(mwc)

  // Horizon
  "Northern Ill.": "Horizon League", //(mac)

  //MWC
  UTEP: "Mountain West Conference", //(cusa)
  Hawaii: "Mountain West Conference", //(bigwest)
};

/** During the off-season (ie before I've fixed the ingest pipeline) these are applied to make the conferences in
 * off-season projects correct
 */
export const latestConfChanges = {
  "2022/23": latestConfChanges_2022,

  "2023/24": {
    ...latestConfChanges_2022,
    ...latestConfChanges_2023,
  },

  "2024/25": {
    ...latestConfChanges_2022,
    ...latestConfChanges_2023,
    ...latestConfChanges_2024,
  },

  "2025/26": {
    ...latestConfChanges_2022,
    ...latestConfChanges_2023,
    ...latestConfChanges_2024,
    ...latestConfChanges_2025,
  },
} as Record<string, Record<string, string>>;

/** During the off-season (ie before I've fixed the ingest pipeline) these are applied to make the conferences in
 * off-season projects correct
 * FOR BUILDING OFF-SEASON PIPELINE,
 */
export const latestConfChanges_yearlyDiffs = {
  "2022/23": latestConfChanges_2022,

  "2023/24": latestConfChanges_2023,

  "2024/25": latestConfChanges_2024,
} as Record<string, Record<string, string>>;
