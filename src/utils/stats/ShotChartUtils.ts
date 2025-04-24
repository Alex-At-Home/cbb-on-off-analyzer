// Lodash:
import _ from "lodash";
import { ShotStats, HexZone, CompressedHexZone, HexData } from "../StatModels";

/** Wrapper for WAB and related utils */
export class ShotChartUtils {
  ///////////////////// Top Level Logic

  /** Creates a smaller JSON object to show player stats in the leaderboard */
  static compressHexZones = (zones: HexZone[]): CompressedHexZone => {
    return {
      total_freq: _.head(zones)?.total_freq || 0,
      info: _.map(
        zones.filter((z) => z.frequency > 0),
        (zone, index) => [index, zone.frequency, zone.intensity]
      ),
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

  /** Converts from the ES aggregation format into all the info we need to display the hex data */
  static shotStatsToHexData = (
    stats: ShotStats,
    diffSet?: Record<
      string,
      { avg_freq: number; avg_ppp: number; loc: number[] }
    >
  ): { data: HexData[]; zones: HexZone[] } => {
    const total_freq = stats?.doc_count || 1;

    const mutableZones = ShotChartUtils.buildStartingZones();

    return {
      zones: mutableZones,
      data: (stats?.shot_chart?.buckets || [])
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
            return {
              diffFreq: diff?.avg_freq || 0,
              diffPpp: diff?.avg_ppp || (_.isNil(diffSet) ? 0.0 : 1.0), //(whether the key is missing or we're not diffing at all)
            };
          });

          const angle = _.thru((Math.atan2(x, y) * 180) / Math.PI, (atan2) =>
            atan2 < 0 ? atan2 + 360 : atan2
          );

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
        .filter((h) => h.x <= 35),
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
    logInfo?: string
  ) => {
    const mutableZones = ShotChartUtils.buildStartingZones();
    _.forEach(diffSet, (diff, hexKey) => {
      const zone = ShotChartUtils.findHexZone(
        diff.loc[0]!,
        diff.loc[1]!,
        mutableZones
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
          3
        )}`
      );

    return mutableZones;
  };

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
