import _ from "lodash";
import { DateUtils } from "../DateUtils";
import { promises as fs } from "fs";

/** Some useful efficiency related info */
type GeoInfo = {
  rosterGeoMap: Record<string, { lat: number; lon: number }>;
};

/** Utils for building - things related to player hometown geo analysis */
export class BatchGeoUtils {
  /** If roster geo information exists them load that up */
  static readonly buildRosterGeoInfo = async (
    inYear: string
  ): Promise<GeoInfo> => {
    if (
      inYear.startsWith("2") && //(eg not "Extra")
      inYear >= DateUtils.firstYearWithRosterGeoData
    ) {
      console.log("Loading roster geo data...");
      const rosterGeoMap = await fs
        .readFile(`./public/rosters/geo/roster_geos.json`)
        .then((s: any) => JSON.parse(s))
        .catch((err: any) => {
          console.log(`Couldn't load roster geo data: [${err}]`);
          return {};
        });
      console.log(`Loaded [${_.size(rosterGeoMap)}] geo entries`);

      return { rosterGeoMap };
    } else {
      return { rosterGeoMap: {} };
    }
  };
}
