// Lodash
import _ from "lodash";

import LRUCache from 'lru-cache';

// @ts-ignore
import LZUTF8 from 'lzutf8';

// Internal components:
import { ParamPrefixes } from "../utils/FilterModels";

/** Wraps LRU and handles compression of the fields, clearing out if space is needed etc */
export class ServerRequestCache {

  private static readonly maxSizeMb: number = 150;
  private static readonly logPeriodMs = 10*1000; //(Every 10s)

  /** Always cache miss if in debug AND disable server cache (this flag) requested */
  static readonly debugDisableServerCache = true;

  // Some debug vars
  private static cacheLastLogged = new Date();
  private static cacheMissesSinceLastLog = 0;
  private static cacheSemiMissesSinceLastLog = 0;
  private static cacheHitsSinceLastLog = 0;

  private static cache = new LRUCache<string, string>({
  	max: ServerRequestCache.maxSizeMb*1024*1024,
    length: (value) => {
        return value.length;
    }
  });

  private static logCacheInfo(isDebug: boolean) {
    const now = new Date();
    const periodSinceLogMs = now.getTime() - ServerRequestCache.cacheLastLogged.getTime();
    if (isDebug || (periodSinceLogMs > ServerRequestCache.logPeriodMs)) {
      console.log(
        `In last [${periodSinceLogMs/(60*1000.0)}]mins, hits=[${ServerRequestCache.cacheHitsSinceLastLog}], semi-misses=[${ServerRequestCache.cacheSemiMissesSinceLastLog}], misses=[${ServerRequestCache.cacheMissesSinceLastLog}] ` +
        `(cache size=[${ServerRequestCache.cache.length/1024}]KB items=[${ServerRequestCache.cache.itemCount}])`
      );
      ServerRequestCache.cacheLastLogged = now;
      ServerRequestCache.cacheHitsSinceLastLog = 0;
      ServerRequestCache.cacheSemiMissesSinceLastLog = 0;
      ServerRequestCache.cacheMissesSinceLastLog = 0;
    }
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
    key: string, prefix: string, epochKey: number | undefined, isDebug: boolean = false
  ): Record<string, any> | null {

    if (isDebug && ServerRequestCache.debugDisableServerCache) {
      return null;
    } else if (0 == ServerRequestCache.maxSizeMb) {
      return null;
    } else {
      const cacheStr = ServerRequestCache.cache.get(ServerRequestCache.cacheKey(key, prefix));
      if (cacheStr) {

        const results =  _.split(cacheStr, ":", 1);
        const cacheEpoch = parseInt(results[0] || "0");
        const compCacheJsonTmp = cacheStr.substring(results[0].length + 1); // +1 for :
        if (!epochKey || !cacheEpoch || (cacheEpoch == epochKey)) {
          if (isDebug) {
            console.log(`Found cache for [${prefix}][${key}] epochs: [${cacheEpoch}, ${epochKey}]`);
          }
          const decompStr = LZUTF8.decompress(
            compCacheJsonTmp, { inputEncoding: "StorageBinaryString" }
          );
          ServerRequestCache.cacheHitsSinceLastLog++;

          // Debug logging:
          ServerRequestCache.logCacheInfo(isDebug);

          return JSON.parse(decompStr);
        } else {
          ServerRequestCache.cacheSemiMissesSinceLastLog++;

          // Debug logging:
          ServerRequestCache.logCacheInfo(isDebug);

          return null; //(will get written back into after the search)
        }
      } else {
        ServerRequestCache.cacheMissesSinceLastLog++;

        // Debug logging:
        ServerRequestCache.logCacheInfo(isDebug);

        return null;
      }
    }
  }

  /** Caches a JSON element */
  static cacheResponse(
    key: string, prefix: string, value: Record<string, any>, epochKey: number | undefined, isDebug: boolean = false
  ) {
    const valueStr = JSON.stringify(value);

    const startTimeMs = new Date().getTime();
    LZUTF8.compressAsync(
      valueStr, { outputEncoding: "StorageBinaryString" },
      (compressedVal, error) => {
        if (error == undefined) {
          const totalTimeMs = new Date().getTime() - startTimeMs;
          if (isDebug || (totalTimeMs > 1000)) {
            console.log(`Took [${totalTimeMs}]ms to compress [${prefix}][${key}]: [${compressedVal.length}] bytes`);
          }
          ServerRequestCache.cache.set(
            ServerRequestCache.cacheKey(key, prefix),
            (epochKey || "0") + ":" + compressedVal
          );
        } else {
          console.log(`Error compressing [${prefix}][${key}]: [${error.message}]`);
        }
      }
    );
  }
}
