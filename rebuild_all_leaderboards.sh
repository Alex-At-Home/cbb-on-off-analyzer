#!/bin/bash
# Use ENRICH=--enrich-rosters to update the rosters with positional info
# Use EXTRA=--extra-data to run in NBA analysis mode (writes to ./enrichedPlayers)
if [ -z "$YEARS" ]; then
   echo "Specify YEARS=all|old|new|YYYY/YY, currently [$YEARS]"
   exit -1
fi
if [ "$YEARS" = "all" ] || [ "$YEARS" = "new" ]; then
  npm run build_leaderboards -- --tier=High $ENRICH $EXTRA; npm run build_leaderboards -- --tier=Medium $ENRICH $EXTRA; npm run build_leaderboards -- --tier=Low $ENRICH $EXTRA; npm run build_leaderboards -- --gender=Women $ENRICH $EXTRA; 
   npm run build_leaderboards -- --tier=Combo
fi
if [ "$YEARS" = "all" ] || [ "$YEARS" = "old" ]; then
   npm run build_leaderboards -- --year=2023/24 --tier=High $ENRICH $EXTRA; npm run build_leaderboards -- --year=2023/24 --tier=Medium $ENRICH $EXTRA; npm run build_leaderboards -- --year=2023/24 --tier=Low $ENRICH $EXTRA; npm run build_leaderboards -- --year=2023/24 --gender=Women --tier=High $ENRICH $EXTRA;
   npm run build_leaderboards -- --tier=Combo --year=2023/24
   npm run build_leaderboards -- --year=2022/23 --tier=High $ENRICH $EXTRA; npm run build_leaderboards -- --year=2022/23 --tier=Medium $ENRICH $EXTRA; npm run build_leaderboards -- --year=2022/23 --tier=Low $ENRICH $EXTRA; npm run build_leaderboards -- --year=2022/23 --gender=Women --tier=High $ENRICH $EXTRA;
   npm run build_leaderboards -- --tier=Combo --year=2022/23
   npm run build_leaderboards -- --year=2021/22 --tier=High $ENRICH $EXTRA; npm run build_leaderboards -- --year=2021/22 --tier=Medium $ENRICH $EXTRA; npm run build_leaderboards -- --year=2021/22 --tier=Low $ENRICH $EXTRA; npm run build_leaderboards -- --year=2021/22 --gender=Women --tier=High $ENRICH $EXTRA;
   npm run build_leaderboards -- --tier=Combo --year=2021/22
   npm run build_leaderboards -- --year=2020/21 --tier=High $ENRICH $EXTRA; npm run build_leaderboards -- --year=2020/21 --tier=Medium $ENRICH $EXTRA; npm run build_leaderboards -- --year=2020/21 --tier=Low $ENRICH $EXTRA; npm run build_leaderboards -- --year=2020/21 --gender=Women --tier=High $ENRICH $EXTRA;
   npm run build_leaderboards -- --tier=Combo --year=2020/21
   npm run build_leaderboards -- --tier=High --year=2019/20 $ENRICH $EXTRA; npm run build_leaderboards -- --tier=High --year=2018/9 $ENRICH $EXTRA;
   npm run build_leaderboards -- --gender=Women --year=2019/20 $ENRICH $EXTRA; npm run build_leaderboards -- --gender=Women --year=2018/9 $ENRICH $EXTRA; 
   npm run build_leaderboards -- --tier=High --year=Extra $ENRICH $EXTRA; 
fi
if [[ $YEARS =~ ^[0-9]{4}[/][0-9]{2}$ ]]; then
   npm run build_leaderboards -- --year=$YEARS --tier=High $ENRICH $EXTRA;npm run build_leaderboards -- --year=$YEARS --tier=Medium $ENRICH $EXTRA; npm run build_leaderboards -- --year=$YEARS --tier=Low $ENRICH $EXTRA; npm run build_leaderboards -- --year=$YEARS --gender=Women --tier=High $ENRICH $EXTRA;
   npm run build_leaderboards -- --tier=Combo --year=$YEARS
fi
