import chroma from "chroma-js";
import _ from "lodash";

type CbbColorTuple = [(val: number) => string, (val: number) => string];

export class CbbColors {
  /** Utility to pick a color scale based on whether the stat is offensive or defensive */
  static picker(
    offScale: (val: number) => string,
    defScale: (val: number) => string
  ) {
    return (val: any, valMeta: string) => {
      const num = _.isNil(val.colorOverride)
        ? (val.value as number)
        : (val.colorOverride as number);
      return num == null || num == undefined
        ? CbbColors.malformedDataColor //(we'll use this color to indicate malformed data)
        : "off" == valMeta
        ? offScale(num)
        : defScale(num);
    };
  }
  /** For off/def tables where only the off is used */
  static offOnlyPicker(
    offScale: (val: number) => string,
    defScale: (val: number) => string
  ) {
    return (val: any, valMeta: string) => {
      return "off" == valMeta
        ? CbbColors.picker(offScale, offScale)(val, valMeta)
        : undefined;
    };
  }
  /** For non-off/def tables, single row */
  static varPicker(scaleFn: (val: number) => string, scale: number = 1) {
    return (val: any, valMeta: string) => {
      const num = _.isNil(val.colorOverride)
        ? (val.value as number)
        : (val.colorOverride as number);
      return num == null || num == undefined
        ? CbbColors.malformedDataColor //(we'll use this color to indicate malformed data)
        : scaleFn(num * scale);
    };
  }

  static toRgba(hex: string, opacity: number) {
    const rgb = chroma(hex).rgb();
    return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${opacity})`;
  }

  static readonly malformedDataColor = "#ccCCcc";
  static readonly background = "#ffFFff";

  private static readonly redToGreen = chroma.scale([
    "red",
    "#ffFFff",
    "green",
  ]);
  private static readonly greenToRed = chroma.scale([
    "green",
    "#ffFFff",
    "red",
  ]);
  private static readonly redBlackGreen = chroma.scale([
    "red",
    "grey",
    "green",
  ]);
  private static readonly greenBlackRed = chroma.scale([
    "green",
    "grey", //(grey not black)
    "red",
  ]);
  private static readonly redGreyGreen = chroma.scale([
    "red",
    "#ddDDdd",
    "green",
  ]);
  private static readonly greenGreyRed = chroma.scale([
    "green",
    "#ddDDdd",
    "red",
  ]);
  private static readonly blueToOrange = chroma.scale([
    "lightblue",
    "#ffFFff",
    "orange",
  ]);
  private static readonly blueBlackOrange = chroma.scale([
    "lightblue",
    "grey",
    "orange",
  ]);
  private static readonly orangeToBlue = chroma.scale([
    "orange",
    "#ffFFff",
    "lightblue",
  ]);
  private static readonly whiteToOrange = chroma.scale(["#ffFFff", "orange"]);

  public static readonly getRedToGreen = () =>
    chroma.scale(["red", "#ffFFff", "green"]);
  public static readonly getBlueToOrange = () =>
    chroma.scale(["lightblue", "#ffFFff", "orange"]);

  public static readonly alwaysWhite = (val: number) => CbbColors.background;
  public static readonly alwaysBlack = (val: number) => "#000000";
  public static readonly alwaysDarkGrey = (val: number) => "#555555";

  // %iles
  private static readonly pctileDomain = [0, 0.5, 1];
  public static readonly off_pctile_qual = (val: number) =>
    CbbColors.redToGreen.domain(CbbColors.pctileDomain)(val).toString();
  public static readonly def_pctile_qual = (val: number) =>
    CbbColors.greenToRed.domain(CbbColors.pctileDomain)(val).toString();
  public static readonly pctile_qual: CbbColorTuple = [
    CbbColors.off_pctile_qual,
    CbbColors.def_pctile_qual,
  ];
  public static readonly all_pctile_freq = (val: number) =>
    CbbColors.blueToOrange.domain(CbbColors.pctileDomain)(val).toString();
  public static readonly pctile_freq: CbbColorTuple = [
    CbbColors.all_pctile_freq,
    CbbColors.all_pctile_freq,
  ];
  private static readonly highPctileDomain = [-0.5, 0.5, 1.5];
  public static readonly high_pctile_qual = (val: number) =>
    CbbColors.redToGreen.domain(CbbColors.highPctileDomain)(val).toString();
  // Pts/100
  private static readonly pp100Domain = [80, 100, 120];
  public static readonly off_pp100 = (val: number) =>
    CbbColors.redToGreen.domain(CbbColors.pp100Domain)(val).toString();
  public static readonly def_pp100 = (val: number) =>
    CbbColors.greenToRed.domain(CbbColors.pp100Domain)(val).toString();
  public static readonly pp100: CbbColorTuple = [
    CbbColors.off_pp100,
    CbbColors.def_pp100,
  ];
  public static readonly off_ppp = (val: number) =>
    CbbColors.redToGreen
      .domain(CbbColors.pp100Domain)(val * 100)
      .toString();
  public static readonly def_ppp = (val: number) =>
    CbbColors.greenToRed
      .domain(CbbColors.pp100Domain)(val * 100)
      .toString();
  public static readonly ppp: CbbColorTuple = [
    CbbColors.off_ppp,
    CbbColors.def_ppp,
  ];
  public static readonly netGuessDomain = [0, 1.0, 2.0];
  public static readonly net_guess = (val: number) =>
    CbbColors.orangeToBlue.domain(CbbColors.netGuessDomain)(val).toString();
  // eFG
  private static readonly eFGDomain = [0.4, 0.5, 0.6];
  public static readonly off_eFG = (val: number) =>
    CbbColors.redToGreen.domain(CbbColors.eFGDomain)(val).toString();
  public static readonly def_eFG = (val: number) =>
    CbbColors.greenToRed.domain(CbbColors.eFGDomain)(val).toString();
  public static readonly eFG: CbbColorTuple = [
    CbbColors.off_eFG,
    CbbColors.def_eFG,
  ];
  // Assist rate:
  private static readonly astDomain = [0.35, 0.5, 0.65];
  public static readonly ast_offDef = (val: number) =>
    CbbColors.blueToOrange.domain(CbbColors.astDomain)(val).toString();
  public static readonly ast: CbbColorTuple = [
    CbbColors.ast_offDef,
    CbbColors.ast_offDef,
  ];
  // TO
  private static readonly toDomain = [0.1, 0.16, 0.22];
  public static readonly off_TO = (val: number) =>
    CbbColors.greenToRed.domain(CbbColors.toDomain)(val).toString();
  public static readonly def_TO = (val: number) =>
    CbbColors.redToGreen.domain(CbbColors.toDomain)(val).toString();
  public static readonly tOver: CbbColorTuple = [
    CbbColors.off_TO,
    CbbColors.def_TO,
  ];
  // OR
  private static readonly orDomain = [0.18, 0.27, 0.36];
  public static readonly off_OR = (val: number) =>
    CbbColors.redToGreen.domain(CbbColors.orDomain)(val).toString();
  public static readonly def_OR = (val: number) =>
    CbbColors.greenToRed.domain(CbbColors.orDomain)(val).toString();
  public static readonly oReb: CbbColorTuple = [
    CbbColors.off_OR,
    CbbColors.def_OR,
  ];
  // ftr
  private static readonly ftrDomain = [0.2, 0.3, 0.4];
  public static readonly off_FTR = (val: number) =>
    CbbColors.redToGreen.domain(CbbColors.ftrDomain)(val).toString();
  public static readonly def_FTR = (val: number) =>
    CbbColors.greenToRed.domain(CbbColors.ftrDomain)(val).toString();
  public static readonly ftr: CbbColorTuple = [
    CbbColors.off_FTR,
    CbbColors.def_FTR,
  ];
  // 3P%
  private static readonly fg3PDomain = [0.26, 0.33, 0.4];
  public static readonly off_3P = (val: number) =>
    CbbColors.redToGreen.domain(CbbColors.fg3PDomain)(val).toString();
  public static readonly def_3P = (val: number) =>
    CbbColors.greenToRed.domain(CbbColors.fg3PDomain)(val).toString();
  public static readonly fg3P: CbbColorTuple = [
    CbbColors.off_3P,
    CbbColors.def_3P,
  ];
  // 2P%
  private static readonly fg2PDomain = [0.4, 0.5, 0.6];
  public static readonly off_2P = (val: number) =>
    CbbColors.redToGreen.domain(CbbColors.fg2PDomain)(val).toString();
  public static readonly def_2P = (val: number) =>
    CbbColors.greenToRed.domain(CbbColors.fg2PDomain)(val).toString();
  public static readonly fg2P: CbbColorTuple = [
    CbbColors.off_2P,
    CbbColors.def_2P,
  ];
  // 2P% mid
  private static readonly fg2PMidDomain = [0.3, 0.4, 0.5];
  public static readonly off_2P_mid = (val: number) =>
    CbbColors.redToGreen.domain(CbbColors.fg2PMidDomain)(val).toString();
  public static readonly def_2P_mid = (val: number) =>
    CbbColors.greenToRed.domain(CbbColors.fg2PMidDomain)(val).toString();
  public static readonly fg2P_mid: CbbColorTuple = [
    CbbColors.off_2P_mid,
    CbbColors.def_2P_mid,
  ];
  // 2P% rim
  private static readonly fg2PRimDomain = [0.5, 0.6, 0.7];
  public static readonly off_2P_rim = (val: number) =>
    CbbColors.redToGreen.domain(CbbColors.fg2PRimDomain)(val).toString();
  public static readonly def_2P_rim = (val: number) =>
    CbbColors.greenToRed.domain(CbbColors.fg2PRimDomain)(val).toString();
  public static readonly fg2P_rim: CbbColorTuple = [
    CbbColors.off_2P_rim,
    CbbColors.def_2P_rim,
  ];
  // Any FG rate
  private static readonly fgrDomain = [0.15, 0.33, 0.5];
  public static readonly fgr_offDef = (val: number) =>
    CbbColors.blueToOrange.domain(CbbColors.fgrDomain)(val).toString();
  public static readonly fgr: CbbColorTuple = [
    CbbColors.fgr_offDef,
    CbbColors.fgr_offDef,
  ];
  // Transition
  private static readonly transDomain = [0.13, 0.18, 0.23];
  public static readonly trans_offDef = (val: number) =>
    CbbColors.blueToOrange.domain(CbbColors.transDomain)(val).toString();

  // Around 0, % (red/green):
  private static readonly diff10DomainRedGreen = [-0.1, 0, 0.1];
  public static readonly off_diff10_redGreen = (val: number) =>
    CbbColors.redToGreen.domain(CbbColors.diff10DomainRedGreen)(val).toString();
  public static readonly def_diff10_redGreen = (val: number) =>
    CbbColors.greenToRed.domain(CbbColors.diff10DomainRedGreen)(val).toString();
  public static readonly diff10_redGreen: CbbColorTuple = [
    CbbColors.off_diff10_redGreen,
    CbbColors.def_diff10_redGreen,
  ];
  public static readonly diff10_greenRed: CbbColorTuple = [
    CbbColors.def_diff10_redGreen,
    CbbColors.off_diff10_redGreen,
  ];
  // bigger diff
  private static readonly diff150DomainRedGreen = [-1.5, 0, 1.5];
  public static readonly off_diff150_redGreen = (val: number) =>
    CbbColors.redToGreen
      .domain(CbbColors.diff150DomainRedGreen)(val)
      .toString();
  public static readonly def_diff150_redGreen = (val: number) =>
    CbbColors.greenToRed
      .domain(CbbColors.diff150DomainRedGreen)(val)
      .toString();

  // Around 0, indiv pp100 (red/green):
  private static readonly diff10Domainp100RedGreen = [-10, 0, 10];
  public static readonly off_diff10_p100_redGreen = (val: number) =>
    CbbColors.redToGreen
      .domain(CbbColors.diff10Domainp100RedGreen)(val)
      .toString();
  public static readonly def_diff10_p100_redGreen = (val: number) =>
    CbbColors.greenToRed
      .domain(CbbColors.diff10Domainp100RedGreen)(val)
      .toString();
  public static readonly diff10_p100_redGreen: CbbColorTuple = [
    CbbColors.off_diff10_p100_redGreen,
    CbbColors.def_diff10_p100_redGreen,
  ];
  public static readonly diff10_p100_greenRed: CbbColorTuple = [
    CbbColors.def_diff10_p100_redGreen,
    CbbColors.off_diff10_p100_redGreen,
  ];
  // Around 0, team pp100 (red/green):
  private static readonly diff35Domainp100RedGreen = [-35, 0, 35];
  public static readonly off_diff35_p100_redGreen = (val: number) =>
    CbbColors.redToGreen
      .domain(CbbColors.diff35Domainp100RedGreen)(val)
      .toString();
  public static readonly def_diff35_p100_redGreen = (val: number) =>
    CbbColors.greenToRed
      .domain(CbbColors.diff35Domainp100RedGreen)(val)
      .toString();
  public static readonly diff35_p100_redGreen: CbbColorTuple = [
    CbbColors.off_diff35_p100_redGreen,
    CbbColors.def_diff35_p100_redGreen,
  ];
  public static readonly diff35_p100_greenRed: CbbColorTuple = [
    CbbColors.def_diff35_p100_redGreen,
    CbbColors.off_diff35_p100_redGreen,
  ];
  // Around 0 (blue/orange):
  private static readonly diff10DomainBlueOrange = [-0.1, 0, 0.1];
  public static readonly diff10_blueOrange_offDef = (val: number) =>
    CbbColors.blueToOrange
      .domain(CbbColors.diff10DomainRedGreen)(val)
      .toString();
  public static readonly diff10_blueOrange: CbbColorTuple = [
    CbbColors.diff10_blueOrange_offDef,
    CbbColors.diff10_blueOrange_offDef,
  ];

  // Personal numbers:
  // Assist rate:
  private static readonly p_astDomain = [0.0, 0.15, 0.35];
  public static readonly p_ast_offDef = (val: number) =>
    CbbColors.blueToOrange.domain(CbbColors.p_astDomain)(val).toString();
  public static readonly p_ast: CbbColorTuple = [
    CbbColors.p_ast_offDef,
    CbbColors.p_ast_offDef,
  ];
  private static readonly p_astBreakdownDomain = [0.0, 0.3];
  public static readonly p_ast_breakdown = (val: number) =>
    CbbColors.whiteToOrange
      .domain(CbbColors.p_astBreakdownDomain)(val)
      .toString();
  // Usage rate:
  private static readonly usgDomain = [0.1, 0.2, 0.3];
  public static readonly usg_offDef = (val: number) =>
    CbbColors.blueToOrange.domain(CbbColors.usgDomain)(val).toString();
  public static readonly usg: CbbColorTuple = [
    CbbColors.usg_offDef,
    CbbColors.usg_offDef,
  ];
  private static readonly usgDomainAlt = [0.1, 0.35];
  public static readonly usg_offDef_alt = (val: number) =>
    CbbColors.whiteToOrange.domain(CbbColors.usgDomainAlt)(val).toString();
  // Personal rebounding
  private static readonly p_orDomain = [0.0, 0.06, 0.12];
  private static readonly p_drDomain = [0.0, 0.15, 0.3];
  public static readonly p_off_OR = (val: number) =>
    CbbColors.blueToOrange.domain(CbbColors.p_orDomain)(val).toString();
  public static readonly p_def_OR = (val: number) =>
    CbbColors.redToGreen.domain(CbbColors.p_drDomain)(val).toString();
  public static readonly p_oReb: CbbColorTuple = [
    CbbColors.p_off_OR,
    CbbColors.p_def_OR,
  ];
  public static readonly p_dReb: CbbColorTuple = [
    CbbColors.p_def_OR,
    CbbColors.p_def_OR,
  ];
  // Personal FTR / FC/50
  public static readonly p_ftr: CbbColorTuple = [
    CbbColors.off_FTR,
    CbbColors.alwaysWhite,
  ];
  // Personal TO / STL
  private static readonly stlDomain = [0.0, 0.02, 0.05];
  public static readonly p_def_TO = (val: number) =>
    CbbColors.blueToOrange.domain(CbbColors.stlDomain)(val).toString();
  public static readonly p_tOver: CbbColorTuple = [
    CbbColors.off_TO,
    CbbColors.p_def_TO,
  ];

  // Personal Rim / Blk
  private static readonly blkDomain = [-0.1, 0.0, 0.1];
  public static readonly p_def_2P_rim = (val: number) =>
    CbbColors.blueToOrange.domain(CbbColors.blkDomain)(val).toString();
  public static readonly p_fg2P_rim: CbbColorTuple = [
    CbbColors.off_2P_rim,
    CbbColors.p_def_2P_rim,
  ];

  // Caliber based on RAPM
  private static readonly rapmBasedCaliber = chroma.scale([
    "#0000ff", //(dark blue - "Bench-", -inf:0)
    "#4a86e8", //(mid blue - "Bench", 0:1)
    "#a4c2f4", //(pale blue - "Rotation", 1:2)
    "#c9daf8", //(light blue - "Rotation+", 2:3)
    "white", //(avoid blending blue and green at 3.5!)
    "#d9ead3", //(light green - "Starter-", 3:4)
    "#b6d7a8", //(pale green - "Starter", 4:5)
    "#93c47d", //(mid green - "Starter+", 5:6)
    "#6aa84f", //(mid green - "All Conf", 6:7)
    "#38761d", //(dark green - "All Conf 1st team", 7:inf)
  ]);
  private static rapmBasedCaliberDomain = [-1, 0, 1, 2, 3, 3.5, 4, 5, 6, 7, 8];
  public static readonly p_rapmCaliber = (val: number) =>
    CbbColors.rapmBasedCaliber
      .domain(CbbColors.rapmBasedCaliberDomain)(val)
      .toString();

  // Tempo
  private static readonly tempoDomain = [60, 68, 76];
  public static readonly p_tempo = (val: number) =>
    CbbColors.blueToOrange.domain(CbbColors.tempoDomain)(val).toString();
  private static readonly transitionDomain = [16, 20, 24];
  public static readonly p_trans = (val: number) =>
    CbbColors.blueToOrange.domain(CbbColors.transitionDomain)(val).toString();

  // RAPM diags:
  // Correlation matrix
  private static readonly rapmCorrelDomain = [0, 0.5, 1.0];
  public static readonly rapmCorrel = (val: number) =>
    CbbColors.blueToOrange.domain(CbbColors.rapmCorrelDomain)(val).toString();
  // Collinearity
  private static readonly rapmCollinLineupDomain = [0.01, 0.25, 1.0];
  private static readonly rapmCollinPlayerDomain = [-1.0, 0.0, 1.0];
  public static readonly rapmCollinLineup = (val: number) =>
    CbbColors.greenToRed
      .domain(CbbColors.rapmCollinLineupDomain)(val)
      .toString();
  public static readonly rapmCollinPlayer = (val: number) =>
    CbbColors.blueToOrange
      .domain(CbbColors.rapmCollinPlayerDomain)(val)
      .toString();

  // Positional diags
  private static readonly posDomain = [-0.5, 0.0, 0.5];
  public static readonly posColors = (val: number) =>
    CbbColors.redToGreen.domain(CbbColors.posDomain)(val).toString();
  // Frequency with which player is at given position
  private static readonly posFreqDomain = [0, 50, 100];
  public static readonly posFreq = (val: number) =>
    CbbColors.whiteToOrange.domain(CbbColors.posFreqDomain)(val).toString();

  // Chart versions of commonly colors:
  public static readonly off_pp100_redBlackGreen = (val: number) =>
    CbbColors.redBlackGreen.domain(CbbColors.pp100Domain)(val).toString();
  public static readonly def_pp100_redBlackGreen = (val: number) =>
    CbbColors.greenBlackRed.domain(CbbColors.pp100Domain)(val).toString();
  public static readonly off_diff10_p100_redBlackGreen = (val: number) =>
    CbbColors.redBlackGreen
      .domain(CbbColors.diff10Domainp100RedGreen)(val)
      .toString();
  public static readonly def_diff10_p100_redBlackGreen = (val: number) =>
    CbbColors.greenBlackRed
      .domain(CbbColors.diff10Domainp100RedGreen)(val)
      .toString();
  public static readonly percentile_redBlackGreen = (val: number) =>
    CbbColors.redBlackGreen.domain(CbbColors.rapmCorrelDomain)(val).toString();
  public static readonly percentile_greenBlackRed = (val: number) =>
    CbbColors.greenBlackRed.domain(CbbColors.rapmCorrelDomain)(val).toString();
  public static readonly percentile_blueBlackOrange = (val: number) =>
    CbbColors.blueBlackOrange
      .domain(CbbColors.rapmCorrelDomain)(val)
      .toString();
  public static readonly usg_offDef_blueBlackOrange = (val: number) =>
    CbbColors.blueBlackOrange.domain(CbbColors.usgDomain)(val).toString();

  public static readonly off_diff20_p100_redToGreen = (val: number) =>
    CbbColors.redToGreen
      .domain(CbbColors.diff10Domainp100RedGreen)(val * 0.5)
      .toString();

  public static readonly off_diff20_p100_redGreyGreen = (val: number) =>
    CbbColors.redGreyGreen
      .domain(CbbColors.diff10Domainp100RedGreen)(val * 0.5)
      .toString();

  public static readonly off_ppp_redGreyGreen = (val: number) =>
    CbbColors.redGreyGreen
      .domain(CbbColors.pp100Domain)(val * 100)
      .toString();

  public static readonly def_ppp_redGreyGreen = (val: number) =>
    CbbColors.greenGreyRed
      .domain(CbbColors.pp100Domain)(val * 100)
      .toString();
}
