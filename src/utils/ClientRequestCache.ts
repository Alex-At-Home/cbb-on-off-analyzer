// Lodash
import _ from "lodash";

// @ts-ignore
import ls from "local-storage";

// @ts-ignore
import LZUTF8, { runningInWebWorker, webWorkersAvailable } from "lzutf8";
// @ts-ignore
import { Base64 } from "js-base64";

// Internal components:
import { preloadedData } from "../utils/internal-data/preloadedData";
import { ParamPrefixes } from "../utils/FilterModels";

/** Wraps local storage and handles compression of the fields, clearing out if space is needed etc */
export class ClientRequestCache {
  /** Always cache miss if in debug AND disable client cache (this flag) requested */
  static readonly debugDisableClientCache = true;

  /** If true, then shows either cached or new version of this - for building preloadedData */
  static readonly debugShowB64Encoded = false;

  /** Strings prefixed with this are treated as B64 encoded LZUTF compressed JSON */
  static readonly base64Prefix = "B64_";

  static safeLocalStorage =
    typeof window == `undefined`
      ? {
          length: 0,
          getItem: function (key: string) {
            return "";
          },
          removeItem: function (key: string) {},
          key: function (index: number) {
            return "";
          },
        }
      : window.localStorage;

  // Handy accessors

  /** If the user has saved a team in the landing page */
  static getSavedTeam(): string | undefined {
    return ClientRequestCache.decacheResponse(
      "landing_show_team",
      "",
      undefined
    )?.value;
  }

  /** If the user has saved a team in the landing page */
  static getSavedGender(): string | undefined {
    return ClientRequestCache.decacheResponse(
      "landing_show_gender",
      "",
      undefined
    )?.value;
  }

  /** If the user has saved a year in the landing page */
  static getSavedYear(): string | undefined {
    return ClientRequestCache.decacheResponse(
      "landing_show_year",
      "",
      undefined
    )?.value;
  }

  // Generic public methods

  /** Wipes the cache */
  static clearCache() {
    const limit = ClientRequestCache.safeLocalStorage.length;
    _.range(limit)
      .map((index) => {
        return ClientRequestCache.safeLocalStorage.key(index) || "";
      })
      .filter((key) => {
        return (
          _.some(Object.values(ParamPrefixes), (prefix) => {
            return _.startsWith(key, prefix);
          }) || _.startsWith(key, "autoOffQuery")
        ); //(gets rid of legacy cache entries)
      })
      .forEach((key) => {
        ClientRequestCache.safeLocalStorage.removeItem(key);
      });
  }

  /** Check if a global refresh has occurred for this gender/year pairing */
  static refreshEpoch(
    gender: string,
    year: string,
    currentEpoch: number,
    isDebug: boolean
  ): boolean {
    const cachedEpochKey = `data-epoch-${gender}-${year}`;
    const cachedEpoch = (ls as any).get(cachedEpochKey) || 0;
    if (cachedEpoch != currentEpoch) {
      if (isDebug) {
        console.log(
          `Force reloading preloads because [${cachedEpoch}] != curr [${currentEpoch}]`
        );
      }
      for (let i = 0; i < 15; i++) {
        const success = (ls as any).set(cachedEpochKey, currentEpoch);
        if (success) {
          break;
        } else {
          ClientRequestCache.removeLru(isDebug);
        }
      }
      return true;
    }
    return false;
  }

  /** Quick look in the cache to see if an element is there */
  static peekForResponse(key: string, prefix: string): boolean {
    return (ls as any).get(prefix + key) ? true : false;
  }

  /** Report and Lineup currently have identical queries so can re-use space */
  private static cacheKey(key: string, prefix: string): string {
    if (prefix == ParamPrefixes.report) {
      return ParamPrefixes.lineup + key;
    } else {
      return prefix + key;
    }
  }

  /** Returns the cached JSON object, if it exists, has a matching epochKey (or epoch key is undefined) - else null */
  static decacheResponse(
    key: string,
    prefix: string,
    epochKey: number | undefined,
    isDebug: boolean = false
  ): Record<string, any> | null {
    // Always cache miss if in debug AND disable client cache requested
    if (isDebug && ClientRequestCache.debugDisableClientCache) {
      return null;
    }
    const cacheStr = (ls as any).get(ClientRequestCache.cacheKey(key, prefix));
    if (!cacheStr) {
      return null; // (cache miss)
    } else {
      // (cache hit) is it compressed or uncompressed?
      if ("{}" == cacheStr) {
        // Special placeholder element
        return {};
      } else if ("{" == cacheStr[0]) {
        // legacy
        const cacheJsonTmp = JSON.parse(cacheStr);
        if (
          !epochKey ||
          !cacheJsonTmp.cacheEpoch ||
          cacheJsonTmp.cacheEpoch == epochKey
        ) {
          //(rewrite it back in compressed format)
          if (isDebug) {
            console.log(
              `Found legacy cache for [${prefix}][${key}] epochs: [${cacheJsonTmp.cacheEpoch}, ${epochKey}]`
            );
          }
          ClientRequestCache.cacheResponse(key, prefix, cacheJsonTmp, epochKey);
          return cacheJsonTmp;
        } else {
          return null; //(cache element has expired)
        }
      } else {
        // compressed
        const results = _.split(cacheStr, ":", 1);
        const cacheEpoch = parseInt(results[0] || "0");
        var compCacheJsonTmp = cacheStr.substring(results[0].length + 1); // +1 for :

        if (!epochKey || !cacheEpoch || cacheEpoch == epochKey) {
          if (isDebug) {
            console.log(
              `Found cache for [${prefix}][${key}] epochs: [${cacheEpoch}, ${epochKey}]`
            );
            if (ClientRequestCache.debugShowB64Encoded) {
              console.log(`Compressed: [${Base64.encode(compCacheJsonTmp)}]`);
            }
          }
          if (_.startsWith(compCacheJsonTmp, ClientRequestCache.base64Prefix)) {
            compCacheJsonTmp = Base64.decode(
              compCacheJsonTmp.substring(ClientRequestCache.base64Prefix.length)
            );
          }
          const decompStr = LZUTF8.decompress(compCacheJsonTmp, {
            inputEncoding: "StorageBinaryString",
          });
          return _.assign(JSON.parse(decompStr), { cacheEpoch: cacheEpoch });
        } else {
          return null;
        }
      }
    }
  }

  /** Caches a JSON element */
  static cacheResponse(
    key: string,
    prefix: string,
    value: Record<string, any>,
    epochKey: number | undefined,
    isDebug: boolean = false
  ) {
    const valueStr = JSON.stringify(value);
    const startTimeMs = new Date().getTime();
    LZUTF8.WebWorker.scriptURI = "/lzutf8.min.js"; //(allow web worker logic)
    LZUTF8.compressAsync(
      valueStr,
      { outputEncoding: "StorageBinaryString" },
      (compressedVal, error) => {
        if (error == undefined) {
          const totalTimeMs = new Date().getTime() - startTimeMs;
          if (isDebug && ClientRequestCache.debugShowB64Encoded) {
            console.log(`Compressed: [${Base64.encode(compressedVal)}]`);
          }
          if (isDebug || totalTimeMs > 1000) {
            console.log(
              `Took [${totalTimeMs}]ms to compress [${prefix}][${key}]: [${compressedVal.length}] bytes`
            );
          }
          ClientRequestCache.directInsertCache(
            key,
            prefix,
            compressedVal,
            epochKey,
            isDebug
          );
        } else {
          console.log(
            `Error compressing [${prefix}][${key}]: [${error.message}]`
          );
        }
      }
    );
  }

  /** Allows a compressed string or "{}" to be injected */
  static directInsertCache(
    key: string,
    prefix: string,
    compressed: string,
    epochKey: number | undefined,
    isDebug: boolean = false
  ) {
    const prefixKey = ClientRequestCache.cacheKey(key, prefix);
    for (let i = 0; i < 15; i++) {
      if (compressed == "{}") {
        //special case for "placeholder cache"
        (ls as any).set(prefixKey, "{}");
      } else {
        const success = (ls as any).set(
          prefixKey,
          (epochKey || "0") + ":" + compressed
        );
        if (success) {
          return true;
        } else {
          // (remove the LRU and try again, up to 15 times)
          ClientRequestCache.removeLru(isDebug);
        }
      }
    } //if we get to here then just let the caller know and exit)
    return false;
  }

  private static removeLru(isDebug: boolean) {
    const limit = ClientRequestCache.safeLocalStorage.length;
    const toRemove = _.transform(
      _.range(20),
      (acc, v) => {
        if (v < limit) {
          const key = ClientRequestCache.safeLocalStorage.key(v) || "";
          const val = ClientRequestCache.safeLocalStorage.getItem(key) || "";
          const isPreloaded = (key: string) => {
            return _.chain(preloadedData)
              .values()
              .some((data) => data.hasOwnProperty(key))
              .value();
          };
          if (val.length > 32 && !isPreloaded(key)) {
            // ignore small fields and pre-loaded data
            acc.push(key);
          }
          if (acc.length >= 5) return false; // already have what we need
        } else return false; //(nothing to do)
      },
      [] as Array<string>
    );
    console.log(`To remove: ${toRemove}`);

    _.forEach(toRemove, (key) => {
      ClientRequestCache.safeLocalStorage.removeItem(key);
    });

    if (isDebug) {
      console.log(`Removing following keys: [${toRemove}]`);
      console.log(
        `From [${limit}] to [${ClientRequestCache.safeLocalStorage.length}] keys in local storage`
      );
    }
  }
}
