export type AbsolutePositionFixRule = {
  position: string;
};

/** Team/season -> player -> positional override */
export const absolutePositionFixes: Record<
  string,
  Record<string, AbsolutePositionFixRule>
> = {
  "Men_Baylor_2018/9": {
    "Vital, Mark": {
      position: "S-PF",
    },
  },
  "Men_Baylor_2019/20": {
    "Vital, Mark": {
      position: "S-PF",
    },
  },
  "Men_Baylor_2020/21": {
    "Vital, Mark": {
      position: "S-PF",
    },
  },
  "Men_Boston College_2019/20": {
    "Popovic, Nik": {
      position: "PF/C",
    },
  },
  "Men_Cincinnati_2020/21": {
    "DeJulius, David": {
      position: "s-PG",
    },
  },
  "Men_Iowa_2020/21": {
    "Garza, Luka": {
      position: "PF/C",
    },
  },
  "Men_Oregon St._2020/21": {
    "Alatishe, Warith": {
      position: "PF/C",
    },
  },
  "Men_Purdue_2020/21": {
    "Wheeler, Aaron": {
      position: "S-PF",
    },
  },
  "Men_Purdue_2021/22": {
    "Ivey, Jaden": {
      position: "s-PG",
    },
  },
  "Men_Maryland_2020/21": {
    "Smart, Aquan": {
      position: "s-PG",
    },
    "Mona, Reese": {
      position: "CG",
    },
    "Graham III, James": {
      position: "WF",
    },
  },
  "Men_Maryland_2021/22": {
    "Hart, Hakim": {
      position: "WG",
    },
  },
  "Men_Maryland_2022/23": {
    "Young, Jahmir": {
      //(such rebounding!)
      position: "s-PG",
    },
    "Batchelor, Noah": {
      position: "WF",
    },
    "Martinez, Ian": {
      position: "CG",
    },
    "Cornish, Ike": {
      position: "WG",
    },
    "Emilien, Patrick": {
      position: "PF/C", //(pretty debatable but since he's playing >50% of his minutes there)
    },
  },
  "Men_Maryland_2023/24": {
    // (while waiting for this to settle down)
    "Young, Jahmir": {
      //(such rebounding!)
      position: "s-PG",
    },
    "Batchelor, Noah": {
      position: "WF",
    },
    "Lamothe, Jahnathan": {
      position: "CG",
    },
    "Long, Jahari": {
      position: "CG",
    },
    "Harris-Smith, DeShawn": {
      position: "CG",
    },
    "Kaiser, Jr., Jamie": {
      position: "WG",
    },
    "Traore, Mady": {
      position: "PF/C",
    },
    "Scott, Donta": {
      position: "WF",
    },
    "Reese, Julian": {
      position: "C",
    },
    "Geronimo, Jordan": {
      position: "S-PF",
    },
  },
  "Men_Maryland_2024/25": {
    "Miguel, Selton": {
      position: "WG",
    },
    "Palmer, Malachi": {
      position: "WF", //(not really but this ensures he gets put at the 4)
    },
  },
  "Men_Michigan St._2020/21": {
    "Hauser, Joey": {
      position: "S-PF",
    },
  },
  "Men_St. Bonaventure_2020/21": {
    "Adaway, Jalen": {
      position: "S-PF",
    },
  },
  "Men_Seton Hall_2020/21": {
    "Mamukelashvili, Sandro": {
      position: "PF/C",
    },
  },
  "Men_Syracuse_2018/9": {
    "Dolezaj, Marek": {
      position: "WF",
    },
  },
  "Men_Syracuse_2020/21": {
    "Dolezaj, Marek": {
      position: "PF/C",
    },
  },
  "Men_Oklahoma St._2021/22": {
    "Moncrieffe, Matthew-Alexander": {
      position: "PF/C",
    },
  },
  "Men_Illinois_2023/24": {
    "Hawkins, Coleman": {
      // Plays a "super stretch 5"
      position: "S-PF",
    },
  },
  "Men_George Washington_2023/24": {
    "Johnson, Garrett": {
      position: "WF",
    },
  },
  "Men_Providence_2023/24": {
    "Carter, Devin": {
      position: "CG",
    },
  },
  "Men_Kentucky_2024/25": {
    "Garrison, Brandon": {
      position: "PF/C",
    },
  },
  "Women_Villanova_2024/25": {
    //(discussion by email)
    "Orihel, Kaitlyn": { position: "WF" },
    "Edmanson, Lara": { position: "S-PF" },
    "Allen, Ryanne": { position: "WF" },
    "Webber, Maddie": { position: "CG" },
  },
  "Women_Villanova_2025/26": {
    //(discussion by email)
    "Bascoe, Jasmine": { position: "s-PG" },
    "Ceseretti, Dani": { position: "CG" },
    "Allen, Ryanne": { position: "WF" },
    "McCurry, Brynn": { position: "PF/C" },
    "Watson, Kylee": { position: "C" },
  },
};

export type RelativePositionFixRule = {
  /** Every non-null code must match the position */
  key: Array<string | undefined>;
  /** How the positions are shuffled */
  rule: Array<{ code: string; id: string } | number | undefined>;
};

/** 7/6/2020: In 4-guard lineups, Morsell plays the 4 (18/19 and 19/20 seasons) */
const Maryland_2018_2020 = [
  {
    // 2/2022: In 4-guard lineups, Morsell plays the 4 (even when he's supposedly playing the 2!)
    key: [undefined, "DaMorsell", undefined, "AaWiggins", undefined],
    rule: [
      undefined,
      3,
      { code: "AaWiggins", id: "Wiggins, Aaron" },
      { code: "DaMorsell", id: "Morsell, Darryl" },
      undefined,
    ],
  },
  {
    // 7/6/2020: In 4-guard lineups, Morsell plays the 4
    key: [undefined, undefined, "DaMorsell", "AaWiggins", undefined],
    rule: [
      undefined,
      undefined,
      { code: "AaWiggins", id: "Wiggins, Aaron" },
      { code: "DaMorsell", id: "Morsell, Darryl" },
      undefined,
    ],
  },
];

/** Team/season -> lineups -> positional overrides */
export const relativePositionFixes: Record<string, RelativePositionFixRule[]> =
  {
    // 13/7/2020: Pack plays the point with Nickens at the SG
    "Men_Maryland_2014/5": [
      {
        key: ["JaNickens", "RiPack", undefined, undefined, undefined],
        rule: [
          { code: "RiPack", id: "Pack, Richaud" },
          { code: "JaNickens", id: "Nickens, Jared" },
          undefined,
          undefined,
          undefined,
        ],
      },
    ],
    "Men_Maryland_2018/9": Maryland_2018_2020,
    "Men_Maryland_2019/20": Maryland_2018_2020.concat([
      // 7/10/2020: Lindo plays the 4 alongside Jalen Smith
      {
        key: [undefined, undefined, undefined, "JaSmith", "RiLindo"],
        rule: [
          undefined,
          undefined,
          undefined,
          { code: "RiLindo", id: "Lindo Jr., Ricky" },
          { code: "JaSmith", id: "Smith, Jalen" },
        ],
      },
    ]),
    // 22/12/2020: Hamilton plays the 5 alongside Scott (+ 4/3); Morsell plays 4 alongside Wiggins
    "Men_Maryland_2020/21": Maryland_2018_2020.concat([
      {
        key: [undefined, undefined, undefined, "JsHamilton", "DoScott"],
        rule: [
          undefined,
          undefined,
          undefined,
          { code: "DoScott", id: "Scott, Donta" },
          { code: "JsHamilton", id: "Hamilton, Jairus" },
        ],
      },
      {
        key: [undefined, undefined, "JsHamilton", "DoScott", undefined],
        rule: [
          undefined,
          undefined,
          { code: "DoScott", id: "Scott, Donta" },
          { code: "JsHamilton", id: "Hamilton, Jairus" },
          undefined,
        ],
      },
    ]),
    // 10/11/2020: Fatts+Martinez are PGs, Ayala plays the 2, Hart plays SF, except Hart>XG  for SG/PF
    "Men_Maryland_2021/22": [
      {
        key: ["HaHart", "IaMartinez", undefined, undefined, undefined],
        rule: [
          { code: "IaMartinez", id: "Martinez, Ian" },
          { code: "HaHart", id: "Hart, Hakim" },
          undefined,
          undefined,
          undefined,
        ],
      },
      {
        key: [undefined, "HaHart", "IaMartinez", undefined, undefined],
        rule: [
          undefined,
          { code: "IaMartinez", id: "Martinez, Ian" },
          { code: "HaHart", id: "Hart, Hakim" },
          undefined,
          undefined,
        ],
      },
      {
        key: [undefined, undefined, "ErAyala", undefined, undefined],
        rule: [
          undefined,
          { code: "ErAyala", id: "Ayala, Eric" },
          2,
          undefined,
          undefined,
        ],
      },
      {
        key: [undefined, undefined, undefined, "ErAyala", undefined],
        rule: [
          undefined,
          { code: "ErAyala", id: "Ayala, Eric" },
          2,
          3,
          undefined,
        ],
      },
      {
        key: [undefined, undefined, "HaHart", "XaGreen", undefined],
        rule: [
          undefined,
          undefined,
          { code: "XaGreen", id: "Green, Xavier" },
          { code: "HaHart", id: "Hart, Hakim" },
          undefined,
        ],
      },
    ],
    "Men_Maryland_2022/23": [
      {
        key: [undefined, undefined, "HaHart", "DoCarey", undefined],
        rule: [
          undefined,
          undefined,
          { code: "DoCarey", id: "Carey, Donald" },
          { code: "HaHart", id: "Hart, Hakim" },
          undefined,
        ],
      },
      {
        key: [undefined, "HaHart", "DoCarey", undefined, undefined],
        rule: [
          undefined,
          { code: "DoCarey", id: "Carey, Donald" },
          { code: "HaHart", id: "Hart, Hakim" },
          undefined,
          undefined,
        ],
      },
    ],
    "Men_Maryland_2023/24": [
      //(this should settle down soon and realize Scott is the PF when playing alongside Batch)
      {
        key: [undefined, undefined, "DoScott", "NoBatchelor", undefined],
        rule: [
          undefined,
          undefined,
          { code: "NoBatchelor", id: "Batcherlor, Noah" },
          { code: "DoScott", id: "Scott, Donta" },
          undefined,
        ],
      },
    ],
    "Men_Illinois_2023/24": [
      // Coleman Hawkins crazy stretch-5-iness causes confusion
      {
        key: [undefined, undefined, undefined, "CoHawkins", "QuGuerrier"],
        rule: [
          undefined,
          undefined,
          undefined,
          { code: "QuGuerrier", id: "Guerrier, Quincy" },
          { code: "CoHawkins", id: "Hawkins, Coleman" },
        ],
      },
    ],
  };
