#!/bin/bash
# Use ENRICH=--enrich-rosters to update the rosters with positional info
# Use EXTRA=--extra-data to run in NBA analysis mode (writes to ./enrichedPlayers) (or --debug)
# Use GENDER_FILTER="men" || GENDER_FILTER="women" if you want only one gender

# Need this to process on-ball defense data
source ../cbb-explorer/.scripts.env
if [ -z "$PBP_OUT_DIR" ]; then
   echo "Need PBP_OUT_DIR from [../cbb-explorer/.scripts.env]"
   exit -1
fi
if [ -z "$YEARS" ]; then
   echo "Specify YEARS=all|old|new|YYYY/YY, currently [$YEARS]"
   exit -1
fi
if [ "$YEARS" = "all" ] || [ "$YEARS" = "new" ]; then
   if [ "$GENDER_FILTER" != "women" ]; then
      npm run build_leaderboards -- --tier=High $ENRICH $EXTRA; 
      npm run build_leaderboards -- --tier=Medium $ENRICH $EXTRA; 
      npm run build_leaderboards -- --tier=Low $ENRICH $EXTRA; 
      npm run build_leaderboards -- --tier=Combo $EXTRA
   fi
   if [ "$GENDER_FILTER" != "men" ]; then
      npm run build_leaderboards -- --gender=Women --tier=High $ENRICH $EXTRA; 
      npm run build_leaderboards -- --gender=Women --tier=Medium $ENRICH $EXTRA; 
      npm run build_leaderboards -- --gender=Women --tier=Low $ENRICH $EXTRA; 
      npm run build_leaderboards -- --gender=Women --tier=Combo $EXTRA; 
   fi
fi
if [ "$YEARS" = "all" ] || [ "$YEARS" = "old" ]; then
   # 2025/26 onwards have all tiers for women
   for y in "2024/25" "2023/24" "2022/23" "2021/22" "2020/21"; do
      if [ "$GENDER_FILTER" != "women" ]; then
         npm run build_leaderboards -- --year=$y --tier=High $ENRICH $EXTRA; 
         npm run build_leaderboards -- --year=$y --tier=Medium $ENRICH $EXTRA; 
         npm run build_leaderboards -- --year=$y --tier=Low $ENRICH $EXTRA; 
      fi
      if [ "$GENDER_FILTER" != "men" ]; then
         npm run build_leaderboards -- --year=$y --gender=Women --tier=High $ENRICH $EXTRA;
      fi
      if [ "$GENDER_FILTER" != "women" ]; then
         npm run build_leaderboards -- --tier=Combo --year=$y $EXTRA
      fi
   done
   # Older data with only one tier:
   for y in "2019/20" "2018/9"; do
      if [ "$GENDER_FILTER" != "women" ]; then
         npm run build_leaderboards -- --tier=High --year=$y $ENRICH $EXTRA;
      fi
      if [ "$GENDER_FILTER" != "men" ]; then
         npm run build_leaderboards -- --gender=Women --year=$y $ENRICH $EXTRA; 
      fi
      if [ "$GENDER_FILTER" != "women" ]; then
         npm run build_leaderboards -- --tier=High --year=Extra $ENRICH $EXTRA; 
      fi
   done
fi
if [[ $YEARS =~ ^[0-9]{4}[/][0-9]{2}$ ]]; then
   if [ "$GENDER_FILTER" != "women" ]; then
      npm run build_leaderboards -- --year=$YEARS --tier=High $ENRICH $EXTRA;
      npm run build_leaderboards -- --year=$YEARS --tier=Medium $ENRICH $EXTRA; 
      npm run build_leaderboards -- --year=$YEARS --tier=Low $ENRICH $EXTRA; 
   fi
   if [ "$GENDER_FILTER" != "men" ]; then
      npm run build_leaderboards -- --year=$YEARS --gender=Women --tier=High $ENRICH $EXTRA;
   fi
   if [ "$GENDER_FILTER" != "women" ]; then
      npm run build_leaderboards -- --tier=Combo --year=$YEARS $EXTRA
   fi
fi
