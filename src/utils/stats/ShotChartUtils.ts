// Lodash:
import _ from "lodash";
import { ShotStats, HexZone, CompressedHexZone, HexData } from "../StatModels";
import { keyAt } from "@collectable/red-black-tree";

/** Wrapper for WAB and related utils */
export class ShotChartUtils {
  ///////////////////// Top Level Logic

  /** Creates a smaller JSON object to show player stats in the leaderboard */
  static compressHexZones = (
    zones: HexZone[],
    rawStats?: ShotStats,
  ): CompressedHexZone => {
    const totalFreq = _.head(zones)?.total_freq || 0;
    const nonZeroBuckets = (rawStats?.shot_chart?.buckets || []).filter(
      (b) => (b.doc_count || 0) > 0,
    );
    return {
      total_freq: totalFreq,
      info: _.map(
        zones.filter((z) => z.frequency > 0),
        (zone, index) => [index, zone.frequency, zone.intensity],
      ),
      data: rawStats
        ? {
            doc_count: rawStats.doc_count || 0,
            keys: _.map(nonZeroBuckets, (b) => b.key || ""),
            info: _.map(nonZeroBuckets, (b) => {
              const x = b.center.location.x;
              const y = b.center.location.y;
              return [x, y, b.total_pts.value, b.doc_count];
            }),
          }
        : undefined,
    };
  };

  /** Inflates the compressed info into a set of hex zones ready to display */
  static decompressHexZones = (comp: CompressedHexZone): HexZone[] => {
    const mutableZones = ShotChartUtils.buildStartingZones();
    _.forEach(comp.info, (zone) => {
      const index = zone[0];
      const frequency = zone[1];
      const intensity = zone[2];
      if (index >= 0 && index < mutableZones.length) {
        mutableZones[index].frequency = frequency;
        mutableZones[index].intensity = intensity;
        mutableZones[index].total_freq = comp.total_freq;
      }
    });
    return mutableZones;
  };

  /** Decompressed compress hex data back to what the ES query response would look like */
  static decompressHexData = (comp: CompressedHexZone): ShotStats => {
    if (comp.data) {
      const infoWithKeys = _.zip(comp.data.keys || [], comp.data.info || []);
      const bucketInsets = _.flatMap(infoWithKeys, ([key, info]) => {
        if (key && info) {
          const x = info[0];
          const y = info[1];
          const total_pts = info[2];
          const doc_count = info[3];
          return [
            {
              key,
              center: {
                location: {
                  x,
                  y,
                },
              },
              total_pts: { value: total_pts },
              doc_count: doc_count,
            },
          ];
        } else {
          return [];
        }
      });
      return {
        doc_count: comp.data.doc_count,
        shot_chart: {
          buckets: bucketInsets,
        },
      };
    } else {
      return {};
    }
  };

  /** Converts from the ES aggregation format into all the info we need to display the hex data
   * diffSet are the D1 averages across all hex keys (confusing name)
   * splitStats is the full set of stats for the alternative sample for this player
   */
  static shotStatsToHexData = (
    stats: ShotStats,
    diffSet?: Record<
      string,
      { avg_freq: number; avg_ppp: number; loc: number[] }
    >,
    splitStats?: ShotStats,
  ): { data: HexData[]; zones: HexZone[]; splitZones?: HexZone[] } => {
    const total_freq = stats?.doc_count || 1;

    const mutableZones = ShotChartUtils.buildStartingZones();

    const data = (stats?.shot_chart?.buckets || [])
      .map((shotInfo) => {
        const hexKey = shotInfo.key || "";
        const x = shotInfo.center.location.x;
        const y = shotInfo.center.location.y;
        const frequency = shotInfo.doc_count;
        const intensity = shotInfo.total_pts.value / shotInfo.doc_count;

        const mutableZone = ShotChartUtils.findHexZone(x, y, mutableZones);
        if (mutableZone) {
          mutableZone.frequency += shotInfo.doc_count;
          mutableZone.intensity += shotInfo.total_pts.value;
          mutableZone.total_freq = total_freq;

          // DEBUG
          //  if (mutableZone.shots) {
          //    mutableZone.shots.push(shotInfo);
          //  } else {
          //    mutableZone.shots = [shotInfo];
          //  }
        }

        const { diffFreq, diffPpp } = _.thru(diffSet?.[hexKey], (diff) => {
          //(currently only using the diffPpp, diffFreq is problematic to display on the chart)
          return {
            diffFreq: diff?.avg_freq || 0,
            diffPpp: diff?.avg_ppp || (_.isNil(diffSet) ? 0.0 : 1.0), //(whether the key is missing or we're not diffing at all)
          };
        });

        // (ended up not using this, but keep it here in case it's useful for debug/diags)
        // const angle = _.thru((Math.atan2(x, y) * 180) / Math.PI, (atan2) =>
        //   atan2 < 0 ? atan2 + 360 : atan2
        // );

        return {
          key: hexKey,
          x,
          y,
          intensity: intensity - diffPpp,
          frequency: 100 * (frequency / total_freq),
          tooltip: `[${frequency}] shots, [${(
            100 *
            (frequency / total_freq)
          ).toFixed(1)}]% of total, [${shotInfo.total_pts.value}]pts, eFG=[${(
            50 * intensity
          ).toFixed(1)}]%`,
        };
      })
      .filter((h) => h.x <= 35);

    return {
      zones: mutableZones,
      data,
      splitZones: splitStats
        ? ShotChartUtils.shotStatsToHexData(splitStats).zones
        : undefined,
    };
  };

  ////////////////////////////////////////

  // UTILS

  /** Finds the zone in which this shot resides */
  static findHexZone = (x: number, y: number, zones: HexZone[]) => {
    const dist = Math.sqrt(x * x + y * y);
    const angle1 = 180 - (Math.atan2(x, y) * 180) / Math.PI; //(inverted because of how the zones are oriented)
    const angle2 = angle1 > 270 ? angle1 - 360 : angle1; //left side: 90->270, right side: -90->90
    const angle = Math.min(180, Math.max(0, angle2));
    const zone = _.find(zones, (zone) => {
      return (
        dist >= zone.minDist &&
        dist <= zone.maxDist &&
        angle >= zone.minAngle &&
        angle <= zone.maxAngle
      );
    });

    //DEBUG
    //   if (!zone) {
    //     console.log(
    //       `No zone found for ${x}, ${y} -> ${dist.toFixed(1)} ${angle.toFixed(1)}`
    //     );
    //   }
    return zone;
  };

  /** Used to build the internal-data set */
  static buildAverageZones = (
    diffSet: Record<
      string,
      { avg_freq: number; avg_ppp: number; loc: number[] }
    >,
    logInfo?: string,
  ) => {
    const mutableZones = ShotChartUtils.buildStartingZones();
    _.forEach(diffSet, (diff, hexKey) => {
      const zone = ShotChartUtils.findHexZone(
        diff.loc[0]!,
        diff.loc[1]!,
        mutableZones,
      );
      if (zone) {
        zone.frequency += diff.avg_freq;
        zone.intensity += diff.avg_ppp * diff.avg_freq;
      } else {
        if (logInfo)
          console.log(`[${logInfo}] No zone found for ${hexKey}`, diff);
      }
    });
    _.forEach(mutableZones, (zone) => {
      zone.intensity /= zone.frequency;
    });
    if (logInfo)
      console.log(
        `export const ShotChartZones_${logInfo}_2024 = ${JSON.stringify(
          mutableZones,
          null,
          3,
        )}`,
      );

    return mutableZones;
  };

  /** Zone index -> region index (0=at rim, 1=close/key, 2=corner 3, 3=above-break 3, 4=mid-range) */
  static readonly ZONE_TO_REGION = [0, 1, 1, 2, 3, 3, 3, 2, 4, 4, 4];

  /**
   * Zone indices that show a circle in regions mode.
   * 0 = at rim; 2 = key (circle at midpoint of zones 1&2, drawn by zone 2);
   * 3, 7 = corner 3s (both show); 5 = above-break 3 middle; 9 = mid-range middle.
   */
  static readonly ZONE_INDICES_THAT_SHOW_CIRCLE = [0, 2, 3, 7, 5, 9];

  /** Number of regions (for aggregation). */
  static readonly NUM_REGIONS = 5;

  /**
   * Aggregates 11 zones into 5 regions. Player zones use frequency=count, intensity=total pts;
   * D1 zones use frequency=fraction (0-1), intensity=PPP. Returns region stats and mapping.
   */
  static zonesToRegions = (
    zones: HexZone[],
    d1Zones?: HexZone[],
  ): {
    regionZones: HexZone[];
    d1RegionZones?: HexZone[];
    zoneToRegion: number[];
    firstZoneIndexPerRegion: number[];
  } => {
    const zoneToRegion = ShotChartUtils.ZONE_TO_REGION;
    const firstZoneIndexPerRegion =
      ShotChartUtils.ZONE_INDICES_THAT_SHOW_CIRCLE;
    const numRegions = ShotChartUtils.NUM_REGIONS;

    const aggregatePlayerRegion = (regionIndex: number): HexZone => {
      const indices = _.filter(
        _.range(zones.length),
        (i) => zoneToRegion[i] === regionIndex,
      );
      const regionZoneList = _.map(indices, (i) => zones[i]!);
      const totalFreq = _.head(regionZoneList)?.total_freq;
      return {
        minDist: 0,
        maxDist: 0,
        minAngle: 0,
        maxAngle: 0,
        angleOffset: 0,
        frequency: _.sumBy(regionZoneList, "frequency"),
        intensity: _.sumBy(regionZoneList, "intensity"),
        total_freq: totalFreq,
      };
    };

    const regionZones = _.map(_.range(numRegions), aggregatePlayerRegion);

    let d1RegionZones: HexZone[] | undefined;
    if (d1Zones && d1Zones.length >= zones.length) {
      d1RegionZones = _.map(_.range(numRegions), (regionIndex) => {
        const indices = _.filter(
          _.range(d1Zones!.length),
          (i) => zoneToRegion[i] === regionIndex,
        );
        const regionZoneList = _.map(indices, (i) => d1Zones![i]!);
        const sumFreq = _.sumBy(regionZoneList, "frequency");
        const weightedIntensity = _.sumBy(
          regionZoneList,
          (z) => z.frequency * z.intensity,
        );
        return {
          minDist: 0,
          maxDist: 0,
          minAngle: 0,
          maxAngle: 0,
          angleOffset: 0,
          frequency: sumFreq,
          intensity: sumFreq > 0 ? weightedIntensity / sumFreq : 0,
        };
      });
    }

    return {
      regionZones,
      d1RegionZones,
      zoneToRegion,
      firstZoneIndexPerRegion,
    };
  };

  /** Useful names */
  static zoneNames = [
    "zone_at_rim",
    "zone_close_left",
    "zone_close_right",
    "zone_mid_left",
    "zone_mid_center",
    "zone_mid_right",
    "zone_3p_baseline_left",
    "zone_3p_left",
    "zone_3p_center",
    "zone_3p_right",
    "zone_3p_baseline_right",
  ];

  /** 0 is vertical axis pointing up, when averaging angle make >= 90 and <= 270 */
  static buildStartingZones = (): HexZone[] => {
    return [
      // Under the basket (1x)
      {
        minDist: 0,
        maxDist: 5,
        distCenter: 0,
        minAngle: 0,
        maxAngle: 360,
        angleOffset: 90,
        frequency: 0,
        intensity: 0,
      },
      // Close to the basket (2x)
      {
        minDist: 5,
        maxDist: 10,
        minAngle: 0,
        maxAngle: 90,
        angleOffset: 70,
        frequency: 0,
        intensity: 0,
      },
      {
        minDist: 5,
        maxDist: 10,
        minAngle: 90,
        maxAngle: 180,
        angleOffset: 110,
        frequency: 0,
        intensity: 0,
      },

      // 3P (5x)
      // (do these before mid-range so we can match on corner 3s first)
      {
        minDist: 21,
        maxDist: 100,
        minAngle: 0,
        maxAngle: 12,
        distCenter: 23,
        angleOffset: 45,
        frequency: 0,
        intensity: 0,
      },
      {
        minDist: 21,
        maxDist: 100,
        minAngle: 12,
        maxAngle: 65,
        angleOffset: 70,
        distCenter: 24,
        frequency: 0,
        intensity: 0,
      },
      {
        minDist: 21,
        maxDist: 100,
        minAngle: 65,
        maxAngle: 115,
        distCenter: 24,
        angleOffset: 90,
        frequency: 0,
        intensity: 0,
      },
      {
        minDist: 21,
        maxDist: 100,
        minAngle: 115,
        maxAngle: 168,
        angleOffset: 110,
        distCenter: 24,
        frequency: 0,
        intensity: 0,
      },
      {
        minDist: 21,
        maxDist: 100,
        minAngle: 168,
        maxAngle: 180,
        distCenter: 23,
        angleOffset: 135,
        frequency: 0,
        intensity: 0,
      },
      // Mid-range (3x)
      {
        minDist: 10,
        maxDist: 21,
        minAngle: 0,
        maxAngle: 45,
        angleOffset: 50,
        frequency: 0,
        intensity: 0,
      },
      {
        minDist: 10,
        maxDist: 21,
        minAngle: 45,
        maxAngle: 135,
        angleOffset: 90,
        frequency: 0,
        intensity: 0,
      },
      {
        minDist: 10,
        maxDist: 21,
        minAngle: 135,
        maxAngle: 180,
        angleOffset: 130,
        frequency: 0,
        intensity: 0,
      },
    ];
  };
}
