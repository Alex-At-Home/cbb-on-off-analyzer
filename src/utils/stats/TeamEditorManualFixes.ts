import { PlayerEditModel, Profiles, TeamEditorUtils } from "./TeamEditorUtils";

import _ from "lodash";
import { freshmenMen2020_21 } from "../public-data/freshmenMen2020_21";
import { freshmenMen2021_22 } from "../public-data/freshmenMen2021_22";
import { freshmenMen2022_23 } from "../public-data/freshmenMen2022_23";
import { freshmenMen2023_24 } from "../public-data/freshmenMen2023_24";
import { freshmenMen2024_25 } from "../public-data/freshmenMen2024_25";
import { freshmenMen2025_26 } from "../public-data/freshmenMen2025_26";
import { superSeniors2021_22 } from "../public-data/superSeniors2021_22";
import { leftTeam2021_22 } from "../public-data/leftTeam2021_22";
import { superSeniors2022_23 } from "../public-data/superSeniors2022_23";
import { leftTeam2022_23 } from "../public-data/leftTeam2022_23";
import { getAllAmericanFrTeam } from "../public-data/allAmericanFreshmen";

const allAmericanBonuses = [0, 8.9, 6.7, 5.9, 5.3]; //(calculated over 5yrs from https://docs.google.com/spreadsheets/d/1W2grnn733eDWb9f7frDCFClzqmBmTo2840RCAiSGc_0/edit#gid=1514587992)
const allAmericanBonusWeight = 0.35; //(35% - arbitrary weight)

/** Note string keys are TeamEditorUtils.getKey, string val in leftTeam is player id (aka name) */
export type TeamEditorManualFixModel = {
  leftTeam?: Array<string>; //Note use normal key for players in DB, omit the "::" for Fr
  superSeniorsReturning?: Set<string>;
  overrides?: Record<string, PlayerEditModel>;
  codeSwitch?: Record<string, string>; //this year code to next year's code, note not currently supported for transfers
};

export class TeamEditorManualFixes {
  /** TODO; This actually takes prevGenderYear, for reasons that are very unclear to me */
  static readonly getFreshmenForYear = _.memoize((genderYear: string) => {
    if (genderYear == "Men_2019/20") {
      //(Fr for the following year given date)
      return TeamEditorManualFixes.buildOverrides(
        freshmenMen2020_21,
        "Men_2020/21"
      );
    } else if (genderYear == "Men_2020/21") {
      return TeamEditorManualFixes.buildOverrides(
        freshmenMen2021_22,
        "Men_2021/22"
      );
    } else if (genderYear == "Men_2021/22") {
      return TeamEditorManualFixes.buildOverrides(
        freshmenMen2022_23,
        "Men_2022/23"
      );
    } else if (genderYear == "Men_2022/23") {
      return TeamEditorManualFixes.buildOverrides(
        freshmenMen2023_24,
        "Men_2023/24"
      );
    } else if (genderYear == "Men_2023/24") {
      return TeamEditorManualFixes.buildOverrides(
        freshmenMen2024_25,
        "Men_2024/25"
      );
    } else if (genderYear == "Men_2024/25") {
      return TeamEditorManualFixes.buildOverrides(
        freshmenMen2025_26,
        "Men_2025/26"
      );
    } else {
      return {};
    }
  });

  /** Does one of two things: builds Fr profiles, or adjusts existing profiles (Fr or otherwise) */
  private static readonly buildOverrides = (
    recruits: Record<string, any>,
    genderYear: string = "NA"
  ) => {
    return _.transform(
      recruits,
      (acc, override, team) => {
        const typedOverrides: Record<
          string,
          {
            pr?: string;
            pos?: string;
            c?: string;
            h?: string;
            r?: number;
            o?: number;
            d?: number;
            m?: number;
          }
        > = override;
        const playerOverrides = _.transform(
          typedOverrides,
          (acc2, over, player) => {
            if (over.pr && over.pos && over.c && over.h) {
              //if profile specified, then specify all fields
              // Specify the entire player profile
              const adjRtg = (over.r || 0) * 0.01;
              const fourStarSuperFactor =
                (over.pr == "4*" && adjRtg >= 0.8
                  ? 0.5 + (adjRtg - 0.8) * 5 * 1.25 //(to make 4* align with T40 you start to get a bigger bonus at 75+, need o+d to get from 1.5 to 3 at adjRtg of 1.0
                  : 0.5) * //(0.5 so the total -1 to 1 range is RAPM of 1)
                0.5; //(*0.5 for off/def)

              const fiveStarFactor = 0.5; //(5* gets bigger range of penalties because values assigned are pretty higher)
              const factor =
                over.pr >= "5*" ? fiveStarFactor : fourStarSuperFactor;

              const factorTimeRatingOff = factor * adjRtg + (over.o || 0);
              const factorTimeRatingDef = -(
                factor * adjRtg +
                (over.d || 0)
              ).toFixed(2);
              const [aaOffAdj, aaDefAdj] = _.thru(
                getAllAmericanFrTeam(over.c, team, genderYear),
                (maybeTeam) => {
                  if (maybeTeam > 0) {
                    const baseForThisRank =
                      TeamEditorUtils.getBenchLevelScoringByProfile(
                        over.pr as Profiles
                      );
                    const initialPredRapm =
                      baseForThisRank +
                      factorTimeRatingOff -
                      factorTimeRatingDef;
                    const teamRapm =
                      allAmericanBonuses[maybeTeam] || initialPredRapm;

                    const adjPredRapm =
                      allAmericanBonusWeight * teamRapm +
                      (1.0 - allAmericanBonusWeight) * initialPredRapm;
                    const adjPredRapmAdj = Math.max(
                      0,
                      adjPredRapm - initialPredRapm
                    );

                    return [0.5 * adjPredRapmAdj, -0.5 * adjPredRapmAdj];
                  } else {
                    return [0, 0];
                  }
                }
              );
              const totalRatingOff = parseFloat(
                (factorTimeRatingOff + aaOffAdj).toFixed(2)
              );
              const totalRatingDef = parseFloat(
                (factorTimeRatingDef + aaDefAdj).toFixed(2)
              );

              acc2[`${over.c}`] = {
                //(index by code not key)
                name: player,
                profile: over.pr as Profiles,
                pos: over.pos,
                height: over.h,
                global_off_adj: totalRatingOff ? totalRatingOff : undefined, //apportion out bonus/penalty if there is one
                global_def_adj: totalRatingDef ? totalRatingDef : undefined,
                fromFrList: true,
              };
            } else if (!over.pr) {
              const code = over.c || player; //(take key as code if non specified)
              //(NOTE: except for Fr, needs to include the "::" suffix or variant)
              acc2[`${code}`] = {
                pos: over.pos,
                mins: over.m,
                height: over.h,
                global_off_adj: over.o,
                global_def_adj: _.isNumber(over.d) ? -over.d : undefined,
              };
            }
          },
          {} as Record<string, PlayerEditModel>
        );
        acc[team] = {
          overrides: playerOverrides,
        };
      },
      {} as Record<string, TeamEditorManualFixModel>
    );
  };
  private static combineOverrides = (
    mutableRecruits: Record<string, TeamEditorManualFixModel>,
    manual: Record<string, TeamEditorManualFixModel>,
    superSeniors: Record<string, string[]> = {},
    leftTeam: Record<string, string[]> = {}
  ) => {
    const phase1 = _.transform(
      manual,
      (acc, override, team) => {
        if (!acc[team]) {
          acc[team] = {};
        }
        _.merge(acc[team], override);
      },
      mutableRecruits
    );

    const phase2 = _.transform(
      superSeniors,
      (acc, override, team) => {
        if (!acc[team]) {
          acc[team] = {};
        }
        if (acc[team].superSeniorsReturning) {
          override.forEach((returningPlayer) =>
            acc[team].superSeniorsReturning!.add(returningPlayer)
          );
        } else {
          acc[team].superSeniorsReturning = new Set(override);
        }
      },
      phase1
    );

    const phase3 = _.transform(
      leftTeam,
      (acc, override, team) => {
        if (!acc[team]) {
          acc[team] = {};
        }
        if (acc[team].leftTeam) {
          acc[team].leftTeam = acc[team].leftTeam!.concat(override);
        } else {
          acc[team].leftTeam = override;
        }
      },
      phase2
    );

    return phase3;
  };

  static readonly fixes: (
    genderYear: string
  ) => Record<string, TeamEditorManualFixModel> = _.memoize(
    (genderYear: string) => {
      const mutableToRet = _.cloneDeep(
        TeamEditorManualFixes.getFreshmenForYear(genderYear)
      );
      //(this gets mutated but of course we don't want to mutate the source data)

      if (genderYear == "Men_2018/9") {
        //offseason of 18/19 ie team for 19/20
        const manualOverrides_Men_2019_20: Record<
          string,
          TeamEditorManualFixModel
        > = {
          Maryland: {
            leftTeam: ["BrFernando::", "KeHuerter::", "JuJackson::"], //(Fernando/Huerter/Jackson appear in Extra, before I did NBA departures)
          },
        };
        return TeamEditorManualFixes.combineOverrides(
          mutableToRet,
          manualOverrides_Men_2019_20
        );
      } else if (genderYear == "Men_2019/20") {
        //(offseason of 19/20, ie team for 20/21)
        const manualOverrides_Men_2020_21: Record<
          string,
          TeamEditorManualFixModel
        > = {
          Maryland: {
            leftTeam: ["BrFernando::"],
          },
          "Texas Tech": {
            leftTeam: ["DaMoretti::"],
          },
          "Seton Hall": {
            ...TeamEditorManualFixes.buildOverrides({
              "": {
                "Aiken, Bryce": {
                  //(he's a super senior, but treat him like a T40 Fr, to give about the right RAPM)
                  pos: "s-PG",
                  pr: "4*/T40ish",
                  c: "BrAiken",
                  h: "5-11",
                  r: 0,
                },
              },
            })[""],
          },
        };
        return TeamEditorManualFixes.combineOverrides(
          mutableToRet,
          manualOverrides_Men_2020_21
        );
      } else if (genderYear == "Men_2020/21") {
        //(offseason of 20/21, ie team for 21/22)
        const manualOverrides_Men_2021_22: Record<
          string,
          TeamEditorManualFixModel
        > = {
          Iowa: {
            superSeniorsReturning: new Set(["JoBohannon::"]),
          },
          Illinois: {
            superSeniorsReturning: new Set(["DaWilliams::"]),
          },
          Kentucky: {
            superSeniorsReturning: new Set(["DaMintz::"]),
          },
          Michigan: {
            superSeniorsReturning: new Set(["ElBrooks::"]),
          },
          "Ohio St.": {
            superSeniorsReturning: new Set(["KyYoung::"]),
          },
          Oklahoma: {
            leftTeam: ["AuReaves::"],
          },
          "San Diego St.": {
            superSeniorsReturning: new Set(["JoTomaic::", "TrPulliam::"]),
          },
          "Seton Hall": {
            superSeniorsReturning: new Set(["MyCale::"]),
          },
          "Southern California": {
            superSeniorsReturning: new Set(["ChGoodwin::"]),
          },
          Tennessee: {
            superSeniorsReturning: new Set(["JoFulkerson::"]),
          },
          "Texas Tech": {
            superSeniorsReturning: new Set(["MaSantos-sil::"]),
          },
          UConn: {
            superSeniorsReturning: new Set(["IsWhaley::"]),
          },
          VCU: {
            superSeniorsReturning: new Set(["LeStockard::"]),
          },
          Wisconsin: {
            superSeniorsReturning: new Set(["BrDavison::"]),
            codeSwitch: { JnDavis: "JoDavis" }, //(sigh... see cbb-exlorer:DataQualityIssues)
          },
        };
        return TeamEditorManualFixes.combineOverrides(
          mutableToRet,
          manualOverrides_Men_2021_22,
          superSeniors2021_22,
          leftTeam2021_22
        );
      } else if (genderYear == "Men_2021/22") {
        //(offseason of 21/22, ie team for 22/23)

        // Add significant injury information from https://www.covers.com/sport/basketball/ncaab/injuries

        const manualOverrides_Men_2022_23: Record<
          string,
          TeamEditorManualFixModel
        > = {
          Alabama: {
            overrides: {
              "JaQuinerly::": { mins: 20 }, //(injury)
            },
          },
          Arizona: {
            ...TeamEditorManualFixes.buildOverrides({
              "": {
                //(some foreign players worth HS T100 rankings)
                "Veesaar, Henri": {
                  pos: "PF/C",
                  pr: "4*/T40ish",
                  c: "HeVeesaar",
                  h: "6-11",
                  r: 54,
                },
                "Borvicanin, Filip": {
                  pos: "WF",
                  pr: "3.5*/T150ish",
                  c: "FiBorvicanin",
                  h: "6-8",
                  r: 72,
                },
                "Boswell, Kylan": {
                  pos: "PG",
                  pr: "4*/T40ish",
                  c: "KyBoswell",
                  h: "6-1",
                  r: 90,
                },
              },
            })[""],
          },
          "Arizona St.": {
            leftTeam: ["JaNeal::"], //(injury)
          },
          Baylor: {
            ...TeamEditorManualFixes.buildOverrides({
              "": {
                "Ojianwuna, Joshua": {
                  pos: "C",
                  pr: "4*",
                  c: "JoOjianwuna",
                  h: "6-10",
                  r: 0,
                },
              },
            })[""],
          },
          BYU: {
            leftTeam: ["CoChandler"], //KEEPME, (Fr on mission - Fr hence no ::)
          },
          Clemson: {
            overrides: {
              "PjHall::": { mins: 25 }, //(injury)
            },
          },
          "Colorado St.": {
            overrides: {
              "IsStevens::": { mins: 10 }, //(injury)
            },
          },
          Drake: {
            overrides: {
              "DjWilkins::": { mins: 15 }, //(injury)
            },
          },
          Duke: {
            //(injuries, see below)
            ...TeamEditorManualFixes.buildOverrides({
              "": {
                "Proctor, Tyrese": {
                  pos: "PG",
                  pr: "5*",
                  c: "TyProctor",
                  h: "6-4",
                  r: -100,
                },
              },
            })[""],
          },
          "Florida St.": {
            leftTeam: ["JaGainey:Brown:"], //(injury)
          },
          Georgia: {
            overrides: {
              "TeRoberts:Bradley:": { mins: 15 }, //(injury)
            },
          },
          "Iowa St.": {
            leftTeam: ["JeWilliams:Temple:"], //(injury)
          },
          Kentucky: {
            leftTeam: ["ShSharpe::"], //KEEPME (NBA draft)
            overrides: {
              "OsTshiebwe::": { mins: 25 }, //(injury)
            },
          },
          Marquette: {
            ...TeamEditorManualFixes.buildOverrides({
              "": {
                //Very strong JUCO
                "Wrightsil, Zach": {
                  pos: "S-PF",
                  pr: "4*",
                  c: "ZaWrightsil",
                  h: "6-7",
                  r: 0,
                },
              },
            })[""],
          },
          Minnesota: {
            leftTeam: ["IsIhnen::"], //(injury)
          },
          Nevada: {
            overrides: {
              "HuMcintosh:Elon:": { mins: 5 }, //(injury)
            },
          },
          "New Mexico St.": {
            overrides: {
              "KiAiken:Arizona:": { mins: 20 }, //(elig.)
            },
          },
          "Ole Miss": {
            superSeniorsReturning: new Set(["TyFagan::"]), //KEEPME
          },
          Oregon: {
            overrides: {
              "JeCouisnard:South Carolina:": { mins: 15 }, //(injury)
            },
          },
          "Oregon St.": {
            overrides: {
              "ChWright:Georgia:": { mins: 15 }, //(injury)
            },
          },
          Pittsburgh: {
            leftTeam: ["DiJohnson"], //(suspension)
          },
          "Texas A&M": {
            overrides: {
              "EtHenderson::": { mins: 5 }, //(suspension)
            },
          },
          "Texas Tech": {
            overrides: {
              "FaAimaq:Utah Valley:": { mins: 20 }, //(injury)
            },
          },
          Villanova: {
            overrides: {
              "JuMoore::": { mins: 20 }, //(injury)
            },
          },
          "Wichita St.": {
            overrides: {
              "CoRogers:Siena:": { mins: 25 }, //(elig)
            },
          },
          Winthrop: {
            leftTeam: ["MiAnumba::"], //(injury)
          },
          Wyoming: {
            overrides: {
              "GrIke::": { mins: 15 }, //(injury)
            },
          },
        };
        const combinedOverrides = TeamEditorManualFixes.combineOverrides(
          mutableToRet,
          manualOverrides_Men_2022_23,
          superSeniors2022_23,
          leftTeam2022_23
        );

        // Duke injury:
        combinedOverrides["Duke"]!.overrides!["DaWhitehead"]!.mins = 25.0; //(injury)
        // Kansas injury
        combinedOverrides["Kansas"]!.overrides!["MjRice"]!.mins = 5.0; //(injury)

        return combinedOverrides;
      } else if (genderYear == "Men_2022/23") {
        //(offseason of 21/22, ie team for 22/23)
        const manualOverrides_Men_2023_24: Record<
          string,
          TeamEditorManualFixModel
        > = {
          //(through Apr 23, see https://barttorvik.com/all_superseniors.php / https://docs.google.com/spreadsheets/d/1LihDf0cb5B703qojm0V0cZ_VXxA0PcXD6999AgwumBM/edit#gid=0)
          "Abilene Christian": {
            superSeniorsReturning: new Set(["ImAllen::", "AiSimmons::"]),
          },
          Alabama: {
            superSeniorsReturning: new Set(["JaQuinerly::"]),
          },
          Arkansas: {
            superSeniorsReturning: new Set(["JaGraham::", "MiMitchell::"]),
          },
          "App State": {
            superSeniorsReturning: new Set(["DoGregory::"]),
          },
          Auburn: {
            superSeniorsReturning: new Set(["LiBerman::", "JaWilliams::"]),
          },
          Baylor: {
            superSeniorsReturning: new Set(["JoTcTchatchoua::"]),
          },
          Belmont: {
            superSeniorsReturning: new Set(["KeDavidson::"]),
          },
          "Boise St.": {
            superSeniorsReturning: new Set(["MaRice::"]),
          },
          "Boston College": {
            superSeniorsReturning: new Set(["QuPost::"]),
          },
          Bradley: {
            superSeniorsReturning: new Set(["MaLeons::"]),
          },
          Butler: {
            superSeniorsReturning: new Set(["JaThomas::"]),
          },
          Campbell: {
            superSeniorsReturning: new Set(["DeDunn::"]),
          },
          California: {
            leftTeam: ["JaTyson:Texas Tech:"], //(waiver_denied: https://docs.google.com/spreadsheets/d/1a8uYxj2fW1XX1yTZbZWMrPqNEcs9a_YMwQ4DCqVHy1o/edit#gid=0)
          },
          "Central Mich.": {
            superSeniorsReturning: new Set(["BrTaylor::"]),
          },
          Charlotte: {
            superSeniorsReturning: new Set(["RoBraswell::"]),
          },
          Cincinnati: {
            superSeniorsReturning: new Set(["OdOguama::"]),
            leftTeam: ["JaReynolds:Temple:"], //(waiver_denied: https://docs.google.com/spreadsheets/d/1a8uYxj2fW1XX1yTZbZWMrPqNEcs9a_YMwQ4DCqVHy1o/edit#gid=0)
          },
          Clemson: {
            superSeniorsReturning: new Set(["AlHemenway::"]),
          },
          Colgate: {
            superSeniorsReturning: new Set(["KeRecords::", "RyMoffatt::"]),
          },
          "Colorado St.": {
            superSeniorsReturning: new Set([
              "PaCartier::",
              "JoStrong::",
              "JoPalmer::",
              "IsStevens::",
            ]),
          },
          Creighton: {
            superSeniorsReturning: new Set(["FrFarabello::", "BaScheierman::"]),
          },
          CSUN: {
            superSeniorsReturning: new Set(["DeAllen-eike::"]),
          },
          Dayton: {
            leftTeam: ["MiSharavjamt::"], //(NBA)
          },
          Delaware: {
            superSeniorsReturning: new Set(["ChRay::"]),
          },
          Drake: {
            superSeniorsReturning: new Set(["DaBrodie::", "TuDevries::"]),
          },
          Drexel: {
            superSeniorsReturning: new Set(["MaOkros::", "LuHouse::"]),
          },
          Duke: {
            superSeniorsReturning: new Set(["RyYoung::"]),
          },
          "Eastern Ill.": {
            superSeniorsReturning: new Set(["JeHamlin::"]),
          },
          "Eastern Ky.": {
            superSeniorsReturning: new Set(["IsCozart::"]),
          },
          "Eastern Mich.": {
            superSeniorsReturning: new Set(["YuJihad::"]),
          },
          Evansville: {
            superSeniorsReturning: new Set(["KeStrawbridg::"]),
          },
          Fairfield: {
            superSeniorsReturning: new Set(["CaFields::", "BrGoodine::"]),
          },
          "Fairleigh Dickinson": {
            superSeniorsReturning: new Set(["HeBligen::"]),
          },
          FGCU: {
            superSeniorsReturning: new Set([
              "IsThompson::",
              "CyLargie::",
              "DaRivers::",
              "FrMiller::",
            ]),
          },
          "Fresno St.": {
            superSeniorsReturning: new Set(["IsHill::"]),
          },
          "Gardner Webb": {
            superSeniorsReturning: new Set(["QuAldridge::"]),
          },
          "George Washington": {
            superSeniorsReturning: new Set(["JaBishop::"]),
          },
          "George Mason": {
            leftTeam: ["JaHaynes:ETSU:"], //(waiver_denied: https://docs.google.com/spreadsheets/d/1a8uYxj2fW1XX1yTZbZWMrPqNEcs9a_YMwQ4DCqVHy1o/edit#gid=0)
          },
          "Georgia Tech": {
            superSeniorsReturning: new Set(["LaTerry::"]),
          },
          Georgetown: {
            leftTeam: ["DaHarris::"], //(bug in how transfers who didn't suit up last year are handled)
          },
          Gonzaga: {
            superSeniorsReturning: new Set(["AnWatson::"]),
          },
          Hampton: {
            superSeniorsReturning: new Set(["BrEarle::"]),
          },
          Illinois: {
            superSeniorsReturning: new Set(["TeShannon::"]),
          },
          Indiana: {
            superSeniorsReturning: new Set(["XaJohnson::"]),
          },
          Iona: {
            superSeniorsReturning: new Set(["OsShema::"]),
          },
          "Iowa St.": {
            superSeniorsReturning: new Set([
              "RoJones::",
              "HaWard::",
              "TrKing::",
            ]),
          },
          Kansas: {
            superSeniorsReturning: new Set(["DaHarris::", "KeMccullar::"]),
            leftTeam: ["ArMorris::", "ArMorris:Texas:"], //(kicked off team - for some reason needed to include in both forms)
          },
          "Kennesaw St.": {
            superSeniorsReturning: new Set(["TeBurden::", "DeRobinson::"]),
          },
          "Kent St.": {
            superSeniorsReturning: new Set(["ChPayton::"]),
          },
          Kentucky: {
            superSeniorsReturning: new Set(["BrCanada::", "AnReeves::"]),
          },
          Liberty: {
            superSeniorsReturning: new Set(["KyRode::", "ShRobinson::"]),
          },
          "Louisinia Tech": {
            superSeniorsReturning: new Set(["DrMangum::"]),
          },
          "Loyola Chicago": {
            superSeniorsReturning: new Set(["BrNorris::", "ToWelch::"]),
          },
          "Loyola Maryland": {
            superSeniorsReturning: new Set(["GoDike::"]),
          },
          "LMU (CA)": {
            superSeniorsReturning: new Set(["KeLeaupepe::"]),
          },
          LSU: {
            leftTeam: ["JaCook:Tulane:"], //(waiver_denied: https://docs.google.com/spreadsheets/d/1a8uYxj2fW1XX1yTZbZWMrPqNEcs9a_YMwQ4DCqVHy1o/edit#gid=0)
          },
          Maryland: {
            leftTeam: ["ChStephens:LMU (CA):"], //(injury expected to be all year)
            superSeniorsReturning: new Set(["JaYoung::", "DoScott::"]),
          },
          Massachusetts: {
            superSeniorsReturning: new Set(["WiLeveque::"]), //(is transferring? leave here for now)
          },
          Memphis: {
            superSeniorsReturning: new Set(["JaHardaway::"]),
          },
          Mercer: {
            superSeniorsReturning: new Set(["JaCobb::"]),
          },
          Missouri: {
            superSeniorsReturning: new Set(["NoCarter::", "NiHonor::"]),
          },
          "Mississippi St.": {
            superSeniorsReturning: new Set([
              "DaDavis::",
              "DjJeffries::",
              "ToSmith::",
            ]),
          },
          Michigan: {
            superSeniorsReturning: new Set(["JaLlewellyn::"]),
          },
          "Michigan St.": {
            superSeniorsReturning: new Set([
              "StIzzo::",
              "TyWalker::",
              "MaHall::",
            ]),
          },
          "Missouri St.": {
            superSeniorsReturning: new Set([
              "DoClay::",
              "DaCarper::",
              "DaRidgnal::",
              "MaLee::",
            ]),
          },
          Montana: {
            superSeniorsReturning: new Set(["AaMoody::"]),
          },
          "Mount St. Mary's": {
            superSeniorsReturning: new Set(["GeTinsley::", "JoVasquez::"]),
          },
          "N.C. A&T": {
            superSeniorsReturning: new Set(["JeRobinson::"]),
          },
          "NC State": {
            superSeniorsReturning: new Set(["DjBurns::", "CaMorsell::"]),
          },
          Nevada: {
            superSeniorsReturning: new Set([
              "KeBlackshear::",
              "JaLucas::",
              "KjHymes::",
              "HuMcintosh::",
            ]),
          },
          "New Mexico": {
            superSeniorsReturning: new Set(["JaHouse::"]),
          },
          "North Dakota": {
            superSeniorsReturning: new Set(["BrDanielson::"]),
          },
          "North Carolina": {
            superSeniorsReturning: new Set(["ArBacot::"]),
          },
          "Northern Colo.": {
            superSeniorsReturning: new Set(["RiAbercrombi::"]),
          },
          "North Florida": {
            superSeniorsReturning: new Set(["DoJames::"]),
          },
          Northwestern: {
            superSeniorsReturning: new Set(["BoBuie::"]),
          },
          Ohio: {
            superSeniorsReturning: new Set(["MiBrown::"]),
          },
          "Ohio St.": {
            superSeniorsReturning: new Set(["TaHolden::"]),
          },
          "Oklahoma St.": {
            superSeniorsReturning: new Set(["JoWright::"]),
          },
          "Ole Miss": {
            superSeniorsReturning: new Set(["MaMurrell::"]),
          },
          "Oral Roberts": {
            superSeniorsReturning: new Set(["KaThompson::"]),
          },
          Oregon: {
            superSeniorsReturning: new Set(["JeCouisnard::", "N'Dante::"]),
          },
          Pittsburgh: {
            leftTeam: ["DiJohnson::"],
          },
          "Portland St.": {
            superSeniorsReturning: new Set(["BoHarvey::"]),
          },
          Quinnipiac: {
            superSeniorsReturning: new Set(["SaLewis::", "MaBalanc::"]),
          },
          Richmond: {
            superSeniorsReturning: new Set(["NeQuinn::", "IsBigelow::"]),
          },
          Rider: {
            superSeniorsReturning: new Set(["AlPowell::"]),
          },
          Rutgers: {
            superSeniorsReturning: new Set(["AuHyatt::"]),
          },
          "Sacred Heart": {
            superSeniorsReturning: new Set([
              "JoReilly::",
              "RaSoloman::",
              "BrMcguire::",
            ]),
          },
          "Saint Joseph's": {
            superSeniorsReturning: new Set(["CaBrown::"]),
          },
          "Saint Louis": {
            superSeniorsReturning: new Set(["GiJimerson::"]),
          },
          "Saint Mary's (CA)": {
            superSeniorsReturning: new Set(["AlDucas::"]),
          },
          "Saint Peters's": {
            superSeniorsReturning: new Set(["LaReid::"]),
          },
          "San Diego": {
            leftTeam: ["SeSiJawara::"],
          },
          "San Diego St.": {
            superSeniorsReturning: new Set(["JaLedee::", "DaTrammell::"]),
          },
          "Santa Clara": {
            superSeniorsReturning: new Set(["CaMarshall::"]),
          },
          Samford: {
            superSeniorsReturning: new Set(["NaJohnson::"]),
          },
          "Seton Hall": {
            superSeniorsReturning: new Set(["AlDawes::"]),
          },
          SMU: {
            superSeniorsReturning: new Set(["SaWilliamson::"]),
          },
          "Southern California": {
            superSeniorsReturning: new Set(["JoMorgan::", "BoEllis::"]),
          },
          "Southern Ill.": {
            superSeniorsReturning: new Set(["XaJohnson::", "TrBrown::"]),
          },
          "St. John's (NY)": {
            superSeniorsReturning: new Set(["JoSoriano::"]),
          },
          "St. Thomas (MN)": {
            superSeniorsReturning: new Set(["PaBjorklund::", "BrAllen::"]),
          },
          Stanford: {
            superSeniorsReturning: new Set(["MiJones::", "SpJones::"]),
          },
          Stonehill: {
            superSeniorsReturning: new Set(["MaZegarowski::"]),
          },
          TCU: {
            superSeniorsReturning: new Set(["ChO'bannon::"]),
          },
          Tennessee: {
            superSeniorsReturning: new Set(["SaVescovi::", "JoJames::"]),
          },
          Texas: {
            superSeniorsReturning: new Set(["BrCunningham::", "DyDisu::"]),
          },
          "Texas A&M": {
            superSeniorsReturning: new Set(["TyRadford::"]),
          },
          "A&M-Corpus Christi": {
            superSeniorsReturning: new Set(["TeMurdix::"]),
          },
          "The Citadel": {
            superSeniorsReturning: new Set(["ElMorgan::"]),
          },
          Toledo: {
            superSeniorsReturning: new Set(["RaDennis::"]),
          },
          Towson: {
            superSeniorsReturning: new Set(["ChThompson::", "ChPaar::"]),
          },
          "UC San Diego": {
            superSeniorsReturning: new Set(["J'Brooks::"]),
          },
          "UC Santa Barbara": {
            superSeniorsReturning: new Set(["JoPierre-lou::"]),
          },
          UCLA: {
            superSeniorsReturning: new Set(["KeNwuba::"]),
          },
          UConn: {
            superSeniorsReturning: new Set(["TrNewton::"]),
          },
          "UNC Asheville": {
            superSeniorsReturning: new Set([
              "DrPember::",
              "TrStephney::",
              "JaBattle::",
              "CaBurgess::",
            ]),
          },
          UNCW: {
            superSeniorsReturning: new Set(["AmKelly::", "ShPhillips::"]),
          },
          UNLV: {
            superSeniorsReturning: new Set(["JuWebster::"]),
          },
          UMKC: {
            superSeniorsReturning: new Set(["AnKopp::"]),
          },
          "USC Upstate": {
            superSeniorsReturning: new Set(["NiAlves::"]),
          },
          "UT Arlington": {
            superSeniorsReturning: new Set(["AaCash::"]),
          },
          Utah: {
            superSeniorsReturning: new Set(["BrCarlson::"]),
          },
          Valparaiso: {
            superSeniorsReturning: new Set(["QuGreen::"]),
          },
          Vanderbilt: {
            superSeniorsReturning: new Set(["EzManjon::", "TyLawrence::"]),
          },
          VCU: {
            leftTeam: ["JoBamisile:George Washington:"], //(waiver_denied: https://docs.google.com/spreadsheets/d/1a8uYxj2fW1XX1yTZbZWMrPqNEcs9a_YMwQ4DCqVHy1o/edit#gid=0)
          },
          Vermont: {
            superSeniorsReturning: new Set(["MaVeretto::", "AaDeloney::"]),
          },
          Villanova: {
            superSeniorsReturning: new Set(["JuMoore::", "ErDixon::"]), //(Dixon is actually a Jr but NCAA roster is wrong)
          },
          "Virginia Tech": {
            superSeniorsReturning: new Set(["HuCattoor::"]),
          },
          "Wake Forest": {
            leftTeam: ["EfReid:Gonzaga:", "EfReid:LSU:", "BoKlintman::"], //(waiver_denied: https://docs.google.com/spreadsheets/d/1a8uYxj2fW1XX1yTZbZWMrPqNEcs9a_YMwQ4DCqVHy1o/edit#gid=0)
          },
          Washington: {
            superSeniorsReturning: new Set(["KeBrooks::"]),
          },
          "Washington St.": {
            superSeniorsReturning: new Set(["DjRodman::"]),
          },
          "West Virginia": {
            leftTeam: ["RaBattle:Montana St.:"], //(waiver_denied: https://docs.google.com/spreadsheets/d/1a8uYxj2fW1XX1yTZbZWMrPqNEcs9a_YMwQ4DCqVHy1o/edit#gid=0)
            superSeniorsReturning: new Set(["JoPerez::", "JoToussaint::"]), //(might be transferring out, leave here in case they return)
          },
          "Western Caro.": {
            superSeniorsReturning: new Set([
              "TrJackson::",
              "VoWoolbright::",
              "RuJones::",
            ]),
          },
          Winthrop: {
            superSeniorsReturning: new Set(["MiAnumba::", "ChClaxton::"]),
          },
          Wisconsin: {
            superSeniorsReturning: new Set(["TyWahl::"]),
          },
          "Wright St.": {
            superSeniorsReturning: new Set(["TrCalvin::"]),
          },
          Wyoming: {
            superSeniorsReturning: new Set(["KeFoster::"]),
          },
          Xavier: {
            superSeniorsReturning: new Set(["JeHunter::", "ZaFreemantle::"]),
          },
          "Youngstown St.": {
            superSeniorsReturning: new Set(["BrRush::"]),
          },
        };

        const combinedOverrides = TeamEditorManualFixes.combineOverrides(
          mutableToRet,
          manualOverrides_Men_2023_24,
          {},
          leftTeam2022_23 //(use prev season until have calculated this season's)
        );
        return combinedOverrides;
      } else if (genderYear == "Men_2023/24") {
        // Super seniors (final time!!), Rothstein up to 6/19 and https://barttorvik.com/all_superseniors.php
        const manualOverrides_Men_2024_25: Record<
          string,
          TeamEditorManualFixModel
        > = {
          "Abilen Christian": {
            superSeniorsReturning: new Set(["HuMadden::"]),
          },
          Alabama: {
            superSeniorsReturning: new Set([
              "LaWrightsell::",
              "GrNelson::",
              "MaSears::",
            ]),
          },
          American: {
            superSeniorsReturning: new Set([
              "MaRogers::",
              "LiBall::",
              "CoSmalls::",
            ]),
          },
          "App State": {
            superSeniorsReturning: new Set(["CjHuntley::", "MyTate::"]),
          },
          Arizona: {
            superSeniorsReturning: new Set(["CaLove::"]),
            ...TeamEditorManualFixes.buildOverrides({
              "": {
                // Adjustments:
                "JaBradley:Alabama:": {
                  o: -1.5,
                },
                "KrMotiejus::": {
                  o: -0.5,
                },
              },
            })[""],
          },
          Arkansas: {
            superSeniorsReturning: new Set(["TrBrazile::"]),
          },
          Auburn: {
            superSeniorsReturning: new Set([
              "DyCardwell::",
              "JoBroome::",
              "ChMoore::",
            ]),
            ...TeamEditorManualFixes.buildOverrides({
              "": {
                // Adjustments:
                "ChBaker-maza::": {
                  o: -1.5,
                },
              },
            })[""],
          },
          Baylor: {
            ...TeamEditorManualFixes.buildOverrides({
              "": {
                // Adjustments:
                "LaLove::": {
                  o: -0.75,
                  d: -0.25,
                },
              },
            })[""],
          },
          "Boise St.": {
            superSeniorsReturning: new Set(["ChAgbo::"]),
          },
          "Bowling Green": {
            superSeniorsReturning: new Set([
              "SaTowns::",
              "TrThomas::",
              "DaHumphrey::",
            ]),
          },
          Bradley: {
            superSeniorsReturning: new Set(["DuDeen::", "DaHannah::"]),
          },
          Butler: {
            superSeniorsReturning: new Set([
              "AnScreen::",
              "FiBizjack::",
              "PoAlexander::",
              "JaTelfort::",
            ]),
          },
          "California Baptist": {
            superSeniorsReturning: new Set(["KeColeman::", "BrStevenson::"]),
          },
          "Central Conn. St.": {
            superSeniorsReturning: new Set(["JaRodgers::", "JoJones::"]),
          },
          Charlotte: {
            superSeniorsReturning: new Set(["RoBraswell::"]),
          },
          Cincinnati: {
            superSeniorsReturning: new Set(["AzBandaogo::", "CjFredrick::"]),
            ...TeamEditorManualFixes.buildOverrides({
              "": {
                // Adjustments:
                "JaJizzle::": {
                  o: -0.5,
                  d: -0.5,
                },
              },
            })[""],
          },
          Clemson: {
            leftTeam: ["PjHall::"], //(NBA declaration not yet included in my automated feed)
            superSeniorsReturning: new Set(["ChHunter::"]),
          },
          Colgate: {
            superSeniorsReturning: new Set(["ChBaker::"]),
          },
          "Colorado St.": {
            superSeniorsReturning: new Set(["NiClifford::"]),
          },
          Creighton: {
            leftTeam: ["TrAlexander::"], //(NBA declaration not yet included in my automated feed)
            superSeniorsReturning: new Set(["RyKalkbrenne::", "StAshworth::"]),
          },
          Davidson: {
            superSeniorsReturning: new Set(["CoKochera::"]),
          },
          Delaware: {
            superSeniorsReturning: new Set(["NiLane::"]),
          },
          Drexel: {
            superSeniorsReturning: new Set(["YaButler::"]),
          },
          "Eastern Ky.": {
            superSeniorsReturning: new Set(["DeBlanton::"]),
          },
          Fairfield: {
            superSeniorsReturning: new Set(["LoBleechmore::"]),
          },
          FGCU: {
            superSeniorsReturning: new Set(["KeKelma::"]),
          },
          FIU: {
            superSeniorsReturning: new Set(["DaWilcox::"]),
          },
          "Fla. Atlantic": {
            superSeniorsReturning: new Set(["JoDavis::"]),
          },
          Fordham: {
            superSeniorsReturning: new Set(["AbTsimbila::", "JaMedor::"]),
          },
          "Fresno St.": {
            superSeniorsReturning: new Set(["JaWeaver::"]),
          },
          Furman: {
            superSeniorsReturning: new Set(["GaHien::"]),
          },
          "Ga. Southern": {
            superSeniorsReturning: new Set(["EuBrown::"]),
          },
          "George Mason": {
            superSeniorsReturning: new Set(["DaMaddox::", "WoNewton::"]),
          },
          Georgetown: {
            ...TeamEditorManualFixes.buildOverrides({
              "": {
                // Adjustments:
                "IsMassoud::": {
                  o: 2.0, //(played injured last season, no way he isn't an average-ish offensive player)
                },
              },
            })[""],
          },
          "Georgia Tech": {
            superSeniorsReturning: new Set(["LaTerry::"]),
          },
          "Grand Canyon": {
            superSeniorsReturning: new Set(["TyGrant-fost::", "JoBlacksher::"]),
          },
          Houston: {
            superSeniorsReturning: new Set([
              "MyWilson::",
              "LjCryer::",
              "J'Roberts::",
            ]),
          },
          "Illinois St.": {
            superSeniorsReturning: new Set([
              "MaPoindexter::",
              "DaBanks::",
              "BrLieb::",
              "JoDavis::",
            ]),
          },
          Indiana: {
            superSeniorsReturning: new Set(["TrGalloway::", "AnLeal::"]),
          },
          Iowa: {
            superSeniorsReturning: new Set(["EvBrauns::"]),
          },
          "Iowa St.": {
            superSeniorsReturning: new Set(["CuJones::"]),
            ...TeamEditorManualFixes.buildOverrides({
              "": {
                // Adjustments:
                "Momcilovic::": {
                  d: -1.0,
                },
              },
            })[""],
          },
          Kansas: {
            superSeniorsReturning: new Set(["HuDickinson::"]),
          },
          "Kansas City": {
            superSeniorsReturning: new Set(["AnKopp::", "BaDiallo::"]),
          },
          "Kansas St.": {
            superSeniorsReturning: new Set(["DaN'guessan::"]),
            ...TeamEditorManualFixes.buildOverrides({
              "": {
                // Adjustments:
                "DuMcDaniel:Michigan:": {
                  o: -0.3,
                  d: -0.3,
                },
                "AcAchor:Samford:": {
                  d: -0.3,
                },
              },
            })[""],
          },
          Kentucky: {
            ...TeamEditorManualFixes.buildOverrides({
              "": {
                // Adjustments:
                "KeKriisa:West Virginia:": {
                  d: 0.7,
                },
              },
            })[""],
          },
          "Loyola Chicago": {
            superSeniorsReturning: new Set(["ShEdwards::"]),
          },
          Lamar: {
            superSeniorsReturning: new Set(["AdHamilton::"]),
          },
          "LMU (CA)": {
            superSeniorsReturning: new Set(["RiIssanza::", "AlMerkviladz::"]),
          },
          Longwood: {
            superSeniorsReturning: new Set(["MiChristmas::"]),
          },
          LSU: {
            superSeniorsReturning: new Set(["DeFountain::"]),
          },
          Marshall: {
            superSeniorsReturning: new Set(["ObAnochili-k::"]),
          },
          Maryland: {
            superSeniorsReturning: new Set(["JoGeronimo::"]),
            ...TeamEditorManualFixes.buildOverrides({
              "": {
                // Adjustments:
                DeQueen: {
                  //(no "::" in key because Fr)
                  o: 1.5,
                  d: -1.5,
                },
                // Missing players:
                //Was OKish as a T75 Fr in limited time, missed a year - so wild guess!
                "Rice, Rodney": {
                  pos: "CG",
                  pr: "4*",
                  c: "RoRice",
                  h: "6-4",
                  r: 90,
                },
                // Late transfer for which source is missing
                "Young, Jayhlon": {
                  pos: "CG",
                  pr: "2*",
                  c: "JaYoung",
                  h: "6-2",
                  o: 0.1, //(relative to pr - hand-picked to give a prediction vs his last 2 years)
                  d: 3.7,
                },
              },
            })[""],
          },
          Memphis: {
            ...TeamEditorManualFixes.buildOverrides({
              "": {
                // Adjustments:
                "BaOkojie:George Mason:": {
                  d: -0.5,
                },
                "PjHaggerty:Tulsa:": {
                  d: -0.5,
                },
              },
            })[""],
          },
          Mercer: {
            superSeniorsReturning: new Set(["AlHolt::"]),
          },
          Miami: {
            superSeniorsReturning: new Set(["NiPack::"]),
          },
          Michigan: {
            superSeniorsReturning: new Set(["NiBurnett::"]),
            ...TeamEditorManualFixes.buildOverrides({
              "": {
                // Adjustments:
                "VlGoldin:Fla. Atlantic:": {
                  o: -0.5,
                },
              },
            })[""],
          },
          "Michigan St.": {
            ...TeamEditorManualFixes.buildOverrides({
              "": {
                // Adjustments:
                "JeFears::": {
                  o: -0.7,
                  d: -0.3,
                },
                "XaBooker::": {
                  o: -0.5,
                  d: -1.0,
                },
              },
            })[""],
          },
          "Middle Tenn.": {
            superSeniorsReturning: new Set(["CaWeston::"]),
          },
          Minnesota: {
            superSeniorsReturning: new Set(["PaFox::"]),
          },
          "Mississippi St.": {
            superSeniorsReturning: new Set(["CaMatthews::"]),
            ...TeamEditorManualFixes.buildOverrides({
              "": {
                // Adjustments:
                "JoHubbard::": {
                  o: -0.35,
                  d: -0.35,
                },
                "JeFoumena:Rhode Island:": {
                  o: -0.3,
                  d: -0.3,
                },
              },
            })[""],
          },
          Missouri: {
            superSeniorsReturning: new Set(["CaGrill::"]),
            ...TeamEditorManualFixes.buildOverrides({
              "": {
                // Adjustments:
                "CaGrill:Iowa St.:": {
                  d: -0.5,
                },
              },
            })[""],
          },
          Montana: {
            superSeniorsReturning: new Set(["BrWhitney::"]),
          },
          "Mount St. Mary's": {
            superSeniorsReturning: new Set(["TeArd::", "XaLipscomb::"]),
          },
          "NC State": {
            superSeniorsReturning: new Set(["Mi'Oconnell::"]),
          },
          Nebraska: {
            leftTeam: ["RiMast::"], //(medical redshirt)
            superSeniorsReturning: new Set(["BrWilliams::", "JuGary::"]),
            ...TeamEditorManualFixes.buildOverrides({
              "": {
                // Adjustments:
                "SaHoiberg::": {
                  o: -0.5,
                },
              },
            })[""],
          },
          Nevada: {
            superSeniorsReturning: new Set([
              "TrColeman::",
              "DaFoster::",
              "KjHymes::",
            ]),
          },
          "New Mexico": {
            superSeniorsReturning: new Set(["NeJoseph::", "MuAmzil::"]),
          },
          "North Carolina": {
            superSeniorsReturning: new Set(["JaWithers::", "RjDavis::"]),
            ...TeamEditorManualFixes.buildOverrides({
              "": {
                // Adjustments:
                "ElCadeau::": {
                  d: -0.7,
                },
              },
            })[""],
          },
          "Northern Ky.": {
            superSeniorsReturning: new Set(["TrRobinson::"]),
          },
          Northwestern: {
            superSeniorsReturning: new Set(["MaNicholson::", "TyBerry::"]),
          },
          Ohio: {
            superSeniorsReturning: new Set(["ShMitchell::"]),
          },
          Oklahoma: {
            superSeniorsReturning: new Set(["SaGodwin::"]),
          },
          "Oklahoma St.": {
            superSeniorsReturning: new Set(["BrThompson::"]),
          },
          "Ole Miss": {
            superSeniorsReturning: new Set(["MaMurrell::", "JaBrakefield::"]),
          },
          "Oral Roberts": {
            superSeniorsReturning: new Set(["KaThompson::"]),
          },
          Oregon: {
            superSeniorsReturning: new Set(["KeBarthelemy::"]),
          },
          "Penn St.": {
            //(Ace Baldwin also returning, but he appears as dup so just leave him out)
            superSeniorsReturning: new Set(["PuJohnson::"]),
          },
          Portland: {
            superSeniorsReturning: new Set(["ChAustin::"]),
          },
          Purdue: {
            ...TeamEditorManualFixes.buildOverrides({
              "": {
                // Adjustments:
                "BrSmith::": {
                  o: -1.0,
                  d: -0.25,
                },
                "CaFurst::": {
                  d: -0.5,
                },
              },
            })[""],
          },
          Quinnipac: {
            superSeniorsReturning: new Set(["SaLewis::"]),
          },
          Radford: {
            superSeniorsReturning: new Set(["TjNesmith::"]),
          },
          Rice: {
            superSeniorsReturning: new Set(["AlHuseinovic::"]),
          },
          Rider: {
            superSeniorsReturning: new Set(["TjWeeks::", "TaIngraham::"]),
          },
          Richmond: {
            superSeniorsReturning: new Set(["DeHunt::"]),
          },
          "Saint Louis": {
            superSeniorsReturning: new Set(["GiJimerson::"]),
          },
          "Saint Mary's (CA)": {
            superSeniorsReturning: new Set(["LuBarrett::", "MiSaxon::"]),
          },
          Samford: {
            superSeniorsReturning: new Set(["RyJones::"]),
          },
          "San Diego St.": {
            superSeniorsReturning: new Set(["LaButler::"]),
          },
          "Seton Hall": {
            superSeniorsReturning: new Set(["DyAddae-wusu::"]),
          },
          "South Carolina": {
            superSeniorsReturning: new Set(["MyStute::"]),
          },
          "South Fla.": {
            superSeniorsReturning: new Set(["BrStroud::"]),
          },
          "Southern Miss.": {
            superSeniorsReturning: new Set(["AnCurbelo::"]),
          },
          SMU: {
            superSeniorsReturning: new Set(["ChHarris::", "KeAmbrose-hy::"]),
          },
          "St. Thomas (MN)": {
            superSeniorsReturning: new Set(["DrDobbs::"]),
          },
          Temple: {
            superSeniorsReturning: new Set(["MaPicarelli::"]),
          },
          Tennessee: {
            ...TeamEditorManualFixes.buildOverrides({
              "": {
                // Adjustments:
                "ChLanier:North Florida:": {
                  o: 1.5,
                  d: 1.0,
                },
              },
            })[""],
          },
          Texas: {
            superSeniorsReturning: new Set(["KaShedrick::"]),
          },
          "Texas A&M": {
            superSeniorsReturning: new Set(["HeColeman::"]),
          },
          "Texas St.": {
            superSeniorsReturning: new Set(["DyDawson::", "TyMorgan::"]),
          },
          "Texas Tech": {
            superSeniorsReturning: new Set([
              "ChMcmillian::",
              "KeWalton::",
              "DeCambridge::",
            ]),
          },
          Towson: {
            superSeniorsReturning: new Set(["MeJones::"]),
          },
          Tulsa: {
            superSeniorsReturning: new Set(["KeWillis::"]),
          },
          UConn: {
            superSeniorsReturning: new Set(["HaDiarra::"]),
          },
          "UC Irvine": {
            superSeniorsReturning: new Set([
              "JuHohn::",
              "AnHenry::",
              "OfUjadughele::",
              "DeKeeler::",
            ]),
          },
          "UC San Diego": {
            superSeniorsReturning: new Set(["DeDahlke::"]),
          },
          UIW: {
            superSeniorsReturning: new Set(["ShRobinson::"]),
          },
          "UMass Lowell": {
            superSeniorsReturning: new Set([
              "QuMincey::",
              "MaBrooks::",
              "YuCovington::",
            ]),
          },
          "UNC Asheville": {
            superSeniorsReturning: new Set([
              "FlAbee::",
              "JoBanks::",
              "GrGantt::",
            ]),
          },
          UNCW: {
            superSeniorsReturning: new Set(["DoNewby::"]),
          },
          UNLV: {
            superSeniorsReturning: new Set(["JaHill::"]),
          },
          Utah: {
            superSeniorsReturning: new Set(["GaMadsen::"]),
          },
          VCU: {
            superSeniorsReturning: new Set([
              "ZeJackson::",
              "JoBamisile::",
              "MaShulga::",
            ]),
            ...TeamEditorManualFixes.buildOverrides({
              "": {
                // Missing players:
                //(for some reason - double transfer? - he doesn't appear, need to track this down
                // but in the meantime, this will do)
                "Clark, Jack": {
                  pos: "WG",
                  pr: "4*",
                  c: "JaClark",
                  h: "6-8",
                  r: 90,
                  o: 0.5,
                  d: 0.5,
                },
              },
            })[""],
          },
          Vermont: {
            leftTeam: ["JaYoung:UCF:"], //(late transfer not included in my transfer source)
            superSeniorsReturning: new Set(["NiFiorillo::", "JaRoquemore::"]),
          },
          Villanova: {
            leftTeam: ["MaArmstrong::"], //(NBA declaration not yet included in my automated feed)
            superSeniorsReturning: new Set(["ErDixon::"]),
          },
          "Virginia Tech": {
            superSeniorsReturning: new Set(["MyPoteat::"]),
          },
          Wagner: {
            superSeniorsReturning: new Set(["RaMoore::"]),
          },
          "Wake Forest": {
            leftTeam: ["BoKlintman::"], //(not sure what happened here, he long gone)
          },
          Washington: {
            superSeniorsReturning: new Set(["FrKepnang::"]),
          },
          "Western Ky.": {
            superSeniorsReturning: new Set([
              "KhLander::",
              "JaJackson::",
              "TyMarshall::",
            ]),
          },
          Winthrop: {
            superSeniorsReturning: new Set([
              "NiJohnson::",
              "KaHarrison::",
              "KeTalford::",
            ]),
          },
          Xavier: {
            superSeniorsReturning: new Set(["ZaFreemantle::", "DaMcknight::"]),
          },
        };
        const combinedOverrides = TeamEditorManualFixes.combineOverrides(
          mutableToRet,
          manualOverrides_Men_2024_25,
          {},
          {} //(use prev season until have calculated this season's)
        );
        return combinedOverrides;
      } else if (genderYear == "Men_2024/25") {
        // (could try https://hoopshype.com/lists/2025-nba-draft-early-entries-whos-testing-the-waters/)
        // (and https://www.rookiescale.com/2025-early-entrant-tracker/)
        const manualOverrides_Men_2025_26: Record<
          string,
          TeamEditorManualFixModel
        > = {
          Alabama: {
            leftTeam: ["LaPhilon::"], //(NBA declaration not yet included in my automated feed)
          },
          Arkansas: {
            leftTeam: ["AdThiero::", "BoFland::"], //(NBA declaration not yet included in my automated feed)
          },
          Baylor: {
            leftTeam: ["VjEdgecombe::"], //(NBA declaration not yet included in my automated feed)
          },
          BYU: {
            leftTeam: ["EgDemin::"], //(NBA declaration not yet included in my automated feed)
          },
          Duke: {
            leftTeam: ["CoFlagg::", "KhMaluach::", "KoKnueppel::"], //(NBA declaration not yet included in my automated feed)
          },
          Florida: {
            leftTeam: ["AlCondon::"], //(NBA declaration not yet included in my automated feed)
          },
          Georgetown: {
            leftTeam: ["ThSorber::"], //(NBA declaration not yet included in my automated feed)
          },
          Georgia: {
            leftTeam: ["AsNewell::"], //(NBA declaration not yet included in my automated feed)
          },
          Illinois: {
            leftTeam: ["KaJakucionis::", "WiRiley::"], //(NBA declaration not yet included in my automated feed)
          },
          Maryland: {
            leftTeam: ["DeQueen::", "TaGapare::"], //(NBA declaration not yet included in my automated feed, and Gapare)
          },
          Michigan: {
            leftTeam: ["DaWolf::"], //(NBA declaration not yet included in my automated feed)
          },
          "Michigan St.": {
            leftTeam: ["JaRichardson::"], //(NBA declaration not yet included in my automated feed)
          },
          Nebraska: {
            superSeniorsReturning: new Set(["RiMast::"]),
          },
          Oklahoma: {
            leftTeam: ["JeFears::"], //(NBA declaration not yet included in my automated feed)
          },
          Oregon: {
            leftTeam: ["NaBittle::"], //(NBA declaration not yet included in my automated feed)
          },
          Rutgers: {
            leftTeam: ["DyHarper::", "AcBailey::"], //(NBA declaration not yet included in my automated feed)
          },
          "Saint Joseph's": {
            leftTeam: ["RaFleming::"], //(NBA declaration not yet included in my automated feed)
          },
          "South Carolina": {
            leftTeam: ["CoMurray-bo::"], //(NBA declaration not yet included in my automated feed)
          },
          "St. John's": {
            leftTeam: ["RjLuis::"], //(NBA declaration not yet included in my automated feed)
          },
          Texas: {
            leftTeam: ["TrJohnson::"], //(NBA declaration not yet included in my automated feed)
          },
          UConn: {
            leftTeam: ["LiMcNeeley::"], //(NBA declaration not yet included in my automated feed)
          },
        };

        const combinedOverrides = TeamEditorManualFixes.combineOverrides(
          mutableToRet,
          manualOverrides_Men_2025_26,
          {},
          {} //(use prev season until have calculated this season's)
        );
        return combinedOverrides;
      } else {
        // Note when calling combineOverrides, need to use leftTeam${prevYear} to handle players who left a season ago
        return {} as Record<string, TeamEditorManualFixModel>;
      }
    }
  );

  /** The top few schools always have premium benches */
  static readonly alwaysTopBench: () => Record<string, PlayerEditModel> =
    () => {
      return {
        [TeamEditorUtils.benchGuardKey]: {
          profile: "4*",
        },
        [TeamEditorUtils.benchWingKey]: {
          profile: "4*",
        },
        [TeamEditorUtils.benchBigKey]: {
          profile: "4*",
        },
      };
    };

  /** The top few schools always have premium benches */
  static readonly genericLoadedBench: () => Record<string, PlayerEditModel> =
    () => {
      return {
        [TeamEditorUtils.benchGuardKey]: {
          profile: "4*/T40ish",
        },
        [TeamEditorUtils.benchWingKey]: {
          profile: "4*/T40ish",
        },
        [TeamEditorUtils.benchBigKey]: {
          profile: "4*/T40ish",
        },
      };
    };
}

// Use this to build leaderboard lists
// console.log(`${
//    _.chain(TeamEditorManualFixes.fixes("Men_2021/22"))
//       .toPairs().flatMap(teamOver => {
//          const team = teamOver[0];
//          const over = teamOver[1];
//          return Array.from(over.superSeniorsReturning || []).map(p => `${p.replaceAll(":","")}:${team}`)
//       }).value().join(";")
// }`)
