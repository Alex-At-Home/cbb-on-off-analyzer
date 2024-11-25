import _ from "lodash";

/** For some reason ncaa.com has different names to stats.ncaa.org! */
const weirdNameChanges: Record<string, string> = {
  "North Carolina St.": "NC State",
  "NC St.": "NC State",
  UNC: "North Carolina",
  Connecticut: "UConn",
  "South Florida": "South Fla.",
  "Loyola (IL)": "Loyola Chicago",
  USC: "Southern California",
  "Southern Cal": "Southern California",
  "Florida Gulf Coast": "FGCU",
  USF: "South Fla.",
  "Saint Mary's": "Saint Mary's (CA)",
  "Miami (Fl.)": "Miami (FL)",
  "Miami (Fla.)": "Miami (FL)",
  "St. John's": "St. John's (NY)",
  Charleston: "Col. of Charleston",
  "Florida Atlantic": "Fla. Atlantic",
  FAU: "Fla. Atlantic",
};
const fixName = (t: string) => weirdNameChanges[t] || t;

////////////////////////////////////////////////////////////////

// AP Rankings

/* poll archives https://www.collegepollarchive.com/ */
const apPollMen_2020_21: () => Record<string, number> = () => {
  return {
    Gonzaga: 1,
    Illinois: 2,
    Baylor: 3,
    Michigan: 4,
    Alabama: 5,
    Houston: 6,
    "Ohio St.": 7,
    Iowa: 8,
    Texas: 9,
    Arkansas: 10,
    "Oklahoma St.": 11,
    Kansas: 12,
    "West Virginia": 13,
    "Florida St.": 14,
    Virginia: 15,
    "San Diego St.": 16,
    "Loyola Chicago": 17,
    Villanova: 18,
    Creighton: 19,
    Purdue: 20,
    "Texas Tech": 21,
    Colorado: 22,
    BYU: 23,
    "Southern California": 24,
    "Virginia Tech": 25,
    __week__: 17,
  };
};

/* poll archives https://www.collegepollarchive.com/ */
const apPollWomen_2020_21: () => Record<string, number> = () => {
  return {
    UConn: 1,
    Stanford: 2,
    "NC State": 3,
    "Texas A&M": 4,
    Baylor: 5,
    "South Carolina": 6,
    Maryland: 7,
    Louisville: 8,
    UCLA: 9,
    Georgia: 10,
    Arizona: 11,
    Indiana: 12,
    Tennessee: 13,
    Gonzaga: 14,
    Arkansas: 15,
    Michigan: 16,
    "West Virginia": 17,
    Kentucky: 18,
    "South Fla.": 19,
    "Missouri St.": 20,
    Rutgers: 21,
    "Ohio St.": 22,
    Oregon: 23,
    "Florida Gulf Coast": 24,
    "South Dakota St.": 25,
    __week__: 17,
  };
};

/** From https://www.ncaa.com/rankings/basketball-men/d1/associated-press. Note you need to edit the names by hand */
const apPollMen_2021_22: () => Record<string, number> = () =>
  _.chain(
    `
1	Gonzaga	26-3	1,518	1
2	Arizona	31-3	1,470	2
3	Kansas	28-6	1,388	6
4	Baylor	26-6	1,286	3
5	Tennessee	26-7	1,235	9
6	Villanova	26-7	1,211	8
7	Kentucky	26-7	1,178	5
8	Auburn	27-5	1,144	4
9	Duke	28-6	986	7
10	Purdue	27-7	958	9
11	UCLA	25-7	823	13
12	Texas Tech	25-9	819	14
13	Providence	25-5	723	11
14	Wisconsin	24-7	685	12
15	Houston	29-5	65	18
16	Iowa	26-9	661	24
17	Arkansas	25-8	578	15
18	Saint Mary's	25-7	508	17
19	Illinois	22-9	457	16
20	Murray State	30-2	425	19
21	UConn	23-9	353	20
22	Southern California	26-7	170	21
23	Boise State	27-7	165	NR
24	Colorado State	25-5	82	23
25	Texas	21-11	72	22
`
  )
    .split("\n")
    .map((l) => {
      const ab = l.split("\t");
      return [fixName((ab[1] || "").replace("State", "St.")), parseInt(ab[0])];
    })
    .fromPairs()
    .assign({
      __week__: 19,
    })
    .value();
/** From https://www.ncaa.com/rankings/basketball-men/d1/associated-press. Note you need to edit the names by hand */
const apPollMen_2022_23: () => Record<string, number> = () =>
  _.chain(
    `
1	Houston (58)	29-2	1,522	1
2	UCLA (3)	27-4	1,452	4
3	Kansas	25-6	1,368	3
4	Alabama	26-5	1,343	2
5	Purdue	26-5	1,274	5
6	Marquette	25-6	1,218	6
7	Texas	23-8	1,100	9
8	Arizona	25-6	1,042	8
9	Gonzaga	26-5	1,031	10
10	Baylor	22-9	961	7
11	UConn	24-7	847	14
12	Kansas State	23-8	838	11
13	Virginia	23-6	791	13
14	Miami (Fla.)	24-6	761	16
15	Xavier	23-8	641	19
16	Saint Mary's	25-6	587	17
17	Tennessee	22-9	573	12
18	Texas A&M	23-8	507	24
19	Indiana	21-10	481	15
20	San Diego State	24-6	370	18
21	Duke	23-8	293	NR
22	TCU	20-11	193	22
23	Kentucky	21-10	138	23
24	Creighton	20-11	133	NR
25	Missouri	23-8	66	NR
`
  )
    .split("\n")
    .map((l) => {
      const ab = l.split("\t");
      return [
        fixName(
          (ab[1] || "").replace(/ *[(][0-9]+[)]/, "").replace("State", "St.")
        ),
        parseInt(ab[0].replace("T-", "")),
      ];
    })
    .fromPairs()
    .assign({
      __week__: 17,
    })
    .value();

/** From https://www.ncaa.com/rankings/basketball-men/d1/associated-press. Note you need to edit the names by hand */
const apPollMen_2023_24: () => Record<string, number> = () =>
  _.chain(
    `
    1	Houston (52)	28-3	1540	1
    2	UConn (6)	28-3	1471	2
    3	Purdue (4)	28-3	1453	3
    4	North Carolina	25-6	1361	7
    5	Tennessee	24-7	1291	4
    6	Arizona	24-7	1125	5
    7	Iowa State	24-7	1120	6
    8	Creighton	23-8	1094	10
    9	Kentucky	23-8	1018	15
    10	Marquette	23-8	1011	8
    11	Duke	24-7	976	9
    12	Auburn	24-7	914	13
    13	Illinois	23-8	802	12
    14	Baylor	22-9	786	11
    15	South Carolina	25-6	567	17
    16	Kansas	22-9	558	14
    17	Gonzaga	24-6	511	19
    18	Utah State	26-5	486	22
    19	Alabama	21-10	432	16
    20	BYU	22-9	381	20
    21	Saint Mary's	24-7	306	23
    22	Washington State	23-8	223	18
    23	Nevada	26-6	223	NR
    24	Dayton	24-6	155	25
    25	Texas Tech	22-9	149	NR
`
  )
    .split("\n")
    .map((l) => {
      const ab = l.split("\t");
      return [
        fixName(
          (ab[1] || "").replace(/ *[(][0-9]+[)]/, "").replace("State", "St.")
        ),
        parseInt(ab[0].replace("T-", "")),
      ];
    })
    .fromPairs()
    .assign({
      __week__: 18,
    })
    .value();

/** From https://www.ncaa.com/rankings/basketball-men/d1/associated-press. Note you need to edit the names by hand */
const apPollMen_2024_25: () => Record<string, number> = () =>
  _.chain(
    `
1	Kansas (51)	5-0	1536	1
2	UConn (6)	4-0	1429	2
3	Gonzaga (2)	5-0	1428	3
4	Auburn (3)	4-0	1393	4
5	Iowa State	3-0	1216	5
6	Houston	3-1	1125	7
7	Tennessee	6-0	1116	11
8	Kentucky	5-0	1075	9
9	Alabama	4-1	1065	8
10	Marquette	6-0	1004	15
11	Duke	4-1	986	12
12	North Carolina	3-1	976	10
13	Purdue	5-1	865	6
14	Indiana	4-0	666	16
15	Wisconsin	7-0	641	19
16	Cincinnati	5-0	610	18
17	Baylor	4-2	482	13
18	Florida	6-0	466	21
19	Arkansas	4-1	387	20
20	Texas A&M	4-1	318	23
21	Creighton	4-1	198	14
22	Xavier	5-0	191	NR
23	Ole Miss	5-0	180	NR
24	Arizona	2-2	154	17
25	Mississippi State	5-0	86	NR
`
  )
    .split("\n")
    .map((l) => {
      const ab = l.split("\t");
      return [
        fixName(
          (ab[1] || "").replace(/ *[(][0-9]+[)]/, "").replace("State", "St.")
        ),
        parseInt(ab[0].replace("T-", "")),
      ];
    })
    .fromPairs()
    .assign({
      __week__: 3,
    })
    .value();

/** From https://www.ncaa.com/rankings/basketball-women/d1/associated-press. Note you need to edit the names by hand */
const apPollWomen_2021_22: () => Record<string, number> = () =>
  _.chain(
    `
1	Kansas (49)	4-0	1509	1
2	UConn (7)	3-0	1416	3
3	Gonzaga (2)	3-0	1397	4
4	Auburn (3)	3-0	1370	5
5	Iowa State	2-0	1184	7
6	Purdue	4-0	1172	13
7	Houston	2-1	1091	8
8	Alabama	3-1	1084	2
9	Kentucky	3-0	1009	19
10	North Carolina	2-1	969	10
11	Tennessee	4-0	942	11
12	Duke	3-1	914	6
13	Baylor	3-1	765	12
14	Creighton	4-0	722	14
15	Marquette	4-0	630	15
16	Indiana	3-0	573	16
17	Arizona	2-1	437	9
18	Cincinnati	3-0	412	17
19	Wisconsin	4-0	370	NR
20	Arkansas	2-1	313	18
21	Florida	4-0	302	20
22	St. John's	4-0	270	22
23	Texas A&M	3-1	233	23
24	Rutgers	3-0	143	24
25	Illinois	3-0	116	NR
`
  )
    .split("\n")
    .map((l) => {
      const ab = l.split("\t");
      return [fixName((ab[1] || "").replace("State", "St.")), parseInt(ab[0])];
    })
    .fromPairs()
    .assign({
      __week__: 19,
    })
    .value();

/** From https://www.ncaa.com/rankings/basketball-women/d1/associated-press. Note you need to edit the names by hand */
const apPollWomen_2022_23: () => Record<string, number> = () =>
  _.chain(
    `
1	South Carolina (28)	32-0	700	1
2	Iowa	26-6	651	7
3	Indiana	27-3	640	2
4	Virginia Tech	27-4	595	8
5	Stanford	28-5	557	6
6	Maryland	25-6	547	5
7	UConn	28-5	543	9
8	Utah	25-4	519	3
9	LSU	28-2	506	4
10	Villanova	28-5	425	11
11	Notre Dame	25-5	401	10
12	Ohio State	25-7	395	14
13	Duke	25-6	327	13
14	Oklahoma	24-5	313	16
15	Texas	23-8	298	12
16	Gonzaga	27-3	282	15
17	UCLA	25-9	273	19
18	Michigan	22-9	175	17
19	North Carolina	21-10	151	18
20	Colorado	23-8	114	20
21	UNLV	28-2	113	22
22	Washington State	23-10	100	NR
23	Tennessee	23-11	92	NR
24	Arizona	21-9	89	21
25	Middle Tennessee	25-4	62	24
`
  )
    .split("\n")
    .map((l) => {
      const ab = l.split("\t");
      return [
        fixName(
          (ab[1] || "").replace(/ *[(][0-9]+[)]/, "").replace("State", "St.")
        ),
        parseInt(ab[0].replace("T-", "")),
      ];
    })
    .fromPairs()
    .assign({
      __week__: 17,
    })
    .value();

/** From https://www.ncaa.com/rankings/basketball-women/d1/associated-press. Note you need to edit the names by hand */
const apPollWomen_2023_24: () => Record<string, number> = () =>
  _.chain(
    `
    1	South Carolina (35)	32-0	875	1
    2	Iowa	29-4	821	3
    3	USC	26-5	809	5
    4	Stanford	28-5	750	2
    5	Texas	28-4	740	6
    6	UCLA	25-6	646	7
    7	Ohio State	25-5	642	4
    8	LSU	28-5	627	8
    9	Notre Dame	26-6	613	14
    10	UConn	28-5	612	9
    11	NC State	27-6	513	10
    12	Oregon State	24-7	465	13
    13	Virginia Tech	24-7	437	11
    14	Gonzaga	29-2	412	15
    15	Indiana	24-5	399	12
    16	Kansas State	25-6	365	16
    17	Oklahoma	22-8	302	19
    18	Colorado	22-9	262	18
    19	Baylor	24-7	234	17
    20	Utah	22-10	170	22
    21	UNLV	27-2	156	23
    22	Syracuse	23-7	129	20
    23	Creighton	25-5	91	21
    24	Louisville	24-9	90	24
    25	Fairfield	28-1	88	25
`
  )
    .split("\n")
    .map((l) => {
      const ab = l.split("\t");
      return [
        fixName(
          (ab[1] || "").replace(/ *[(][0-9]+[)]/, "").replace("State", "St.")
        ),
        parseInt(ab[0].replace("T-", "")),
      ];
    })
    .fromPairs()
    .assign({
      __week__: 18,
    })
    .value();

/** From https://www.ncaa.com/rankings/basketball-women/d1/associated-press. Note you need to edit the names by hand */
const apPollWomen_2024_25: () => Record<string, number> = () =>
  _.chain(
    `
1	South Carolina (31)	4-0	775	1
2	UConn	3-0	735	2
3	Southern California	4-0	700	3
4	Texas	3-0	662	4
5	UCLA	4-0	653	5
6	Notre Dame	4-0	646	6
7	LSU	4-0	566	7
8	Iowa State	4-0	549	8
9	Oklahoma	3-0	523	9
10	Kansas State	3-0	486	10
11	Maryland	5-0	476	11
12	Ohio State	3-0	417	12
13	West Virginia	4-0	387	15
14	Duke	4-1	321	16
15	Kentucky	4-0	292	20
16	North Carolina	3-1	285	14
17	Ole Miss	2-1	237	19
18	Baylor	3-1	194	17
19	TCU	4-0	182	NR
20	North Carolina State	2-2	177	13
21	Nebraska	4-0	164	21
22	Illinois	3-0	129	23
23	Oregon	4-0	122	25
24	Alabama	6-0	120	22
25	Louisville	2-2	96	18
`
  )
    .split("\n")
    .map((l) => {
      const ab = l.split("\t");
      return [
        fixName(
          (ab[1] || "").replace(/ *[(][0-9]+[)]/, "").replace("State", "St.")
        ),
        parseInt(ab[0].replace("T-", "")),
      ];
    })
    .fromPairs()
    .assign({
      __week__: 2,
    })
    .value();

/** Contains NCAA/KP lookups for gender/years where we want to retrieve efficiency from the cache (current year only) */
export const apPolls: Record<string, () => Record<string, number>> = {
  "Women_2020/21": _.memoize(apPollWomen_2020_21),
  "Women_2021/22": _.memoize(apPollWomen_2021_22),
  "Women_2022/23": _.memoize(apPollWomen_2022_23),
  "Women_2023/24": _.memoize(apPollWomen_2023_24),
  "Women_2024/25": _.memoize(apPollWomen_2024_25),

  "Men_2020/21": _.memoize(apPollMen_2020_21),
  "Men_2021/22": _.memoize(apPollMen_2021_22),
  "Men_2022/23": _.memoize(apPollMen_2022_23),
  "Men_2023/24": _.memoize(apPollMen_2023_24),
  "Men_2024/25": _.memoize(apPollMen_2024_25),
};

////////////////////////////////////////////////////////////////

// AP Rankings

/** From https://www.ncaa.com/news/basketball-men/article/2022-03-13/2022-ncaa-mens-tournament-bids-all-68-march-madness-teams. Note you need to edit the names by hand */
const sCurveMen_2021_22: () => Record<string, number> = () =>
  _.chain(
    `
1. Gonzaga (26 - 3)
2. Arizona (31 - 3)
3. Kansas (28 - 6)
4. Baylor (26 - 6)
5. Auburn (27 - 5)
6. Kentucky (26 - 7)
7. Villanova (26 - 7)
8. Duke (28 - 6)
9. Wisconsin (24 - 7)
10. Tennessee (26 - 7)
11. Purdue (27 - 7)
12. Texas Tech (25 - 9)
13. UCLA (25 - 7)
14. Illinois (22 - 9)
15. Providence (25 - 5)
16. Arkansas (25 - 8)
17. UConn (23 - 9)
18. Houston (29 - 5)
19. Saint Mary's (CA) (25 - 7)
20. Iowa (26 - 9)
21. Alabama (19 - 13)
22. LSU (22 - 11)
23. Texas (21 - 11)
24. Colorado St. (25 - 5)
25. Southern California (26 - 7)
26. Murray St. (30 - 2)
27. Michigan St. (22 - 12)
28. Ohio St. (19 - 11)
29. Boise St. (27 - 7)
30. North Carolina (24 - 9)
31. San Diego St. (23 - 8)
32. Seton Hall (21 - 10)
33. Creighton (22 - 11)
34. TCU (20 - 12)
35. Marquette (19 - 12)
36. Memphis (21 - 10)
37. San Francisco (24 - 9)
38. Miami (FL) (23 - 10)
39. Loyola Chicago (25 - 7)
40. Davidson (27 - 6)
41. Iowa St. (20 - 12)
42. Michigan (17 - 14)
43. Wyoming (25 - 8)
44. Rutgers (18 - 13)
45. Indiana (20 - 13)
46. Virginia Tech (23 - 12)
47. Notre Dame (22 - 10)
48. Dayton (0 - 0)
49. Oklahoma (0 - 0)
50. SMU (0 - 0)
51. Texas A&M (0 - 0)
`
  )
    .split("\n")
    .map((l) => {
      const ab = l
        .replace(/^([0-9]+)[.] +(.*) +[(][0-9].*/, "$1\t$2")
        .split("\t");
      return [fixName((ab[1] || "").replace("State", "St.")), parseInt(ab[0])];
    })
    .fromPairs()
    .value();

const sCurveWomen_2021_22: () => Record<string, number> = () =>
  _.chain(
    `
South Carolina
Stanford
NC State
Louisville
Baylor
UConn
Texas
Iowa
Iowa State
LSU
Indiana
Michigan
Tennessee
Oklahoma
Maryland
Arizona
UNC
Virginia Tech
Notre Dame
Oregon
BYU
Kentucky
Ohio State
Georgia
Colorado
Utah
UCF
Ole Miss
Nebraska
Washington State
Kansas
Miami (FL)
USF
Georgia Tech
Kansas State
Gonzaga
South Dakota
Florida
Arkansas
Creighton
Princeton
Villanova
Dayton
DePaul
Florida State
Missouri State
FGCU
Belmont
Oregon State
Boston College
South Dakota State
Marquette
`
  )
    .split("\n")
    .map((l, rank) => {
      return [fixName(l.replace("State", "St.")), rank];
    })
    .fromPairs()
    .value();

export const sCurves: Record<string, () => Record<string, number>> = {
  "Men_2021/22": _.memoize(sCurveMen_2021_22),
  "Women_2021/22": _.memoize(sCurveWomen_2021_22),
};
