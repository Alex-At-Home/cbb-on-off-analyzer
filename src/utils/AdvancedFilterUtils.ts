
import _ from 'lodash';
import Enumerable from 'linq';

/** Library accepts strings. but typescript extension doesn't */
type TypeScriptWorkaround1 = (element: any, index: number) => boolean;
type TypeScriptWorkaround2 = (element: any) => unknown;
type EnumToEnum = (e: Enumerable.IEnumerable<any>) => Enumerable.IEnumerable<any>;

/** Utils to build LINQ filter/sort capabilities */
export class AdvancedFilterUtils {

   static readonly playerLeaderBoardAutocomplete = [
      "&&", "||", "SORT_BY", "ASC", "DESC", "AND", "OR",

      // Basic metadata:
      "conf", "team", "year",

      // Advanced metadata:
      "posClass",
      "posConfidences", 
      "roster.number", "roster.height", "roster.year_class", "roster.pos",
      "tier",

      // Opposition strength
      "off_adj_opp",
      "def_adj_opp",

      // Possessions
      "off_poss", "off_team_poss", "off_team_poss_pct",
      "def_poss", "def_team_poss", "def_team_poss_pct",

      // Four factors
      "off_efg", "off_to", "off_ftr",

      // Overall:
      "adj_rtg_margin", "adj_prod_margin", "adj_rapm_margin", "adj_rapm_prod_margin",
      "adj_rtg_margin_rank", "adj_prod_margin_rank", "adj_rapm_margin_rank", "adj_rapm_prod_margin_rank",

      "off_rtg", "off_adj_rtg", "off_adj_prod", "off_adj_rapm", "off_adj_rapm_prod",
      "off_adj_rtg_rank", "off_adj_prod_rank", "off_adj_rapm_rank", "off_adj_rapm_prod_rank",

      "def_rtg", "def_adj_rtg", "def_adj_prod", "def_adj_rapm", "def_adj_prod",
      "def_adj_rtg_rank", "def_adj_prod_rank", "def_adj_rapm_rank", "def_adj_rapm_prod_rank",

      // Shot creation
      "off_usage", "off_assist", "off_ast_rim", "off_ast_mid", "off_ast_3p",
      "off_2primr", "off_2pmidr", "off_3pr", 

      // Shot-making
      "off_3p", "off_2p", "off_2pmid", "off_2prim", "off_ft",
      "off_3p_ast", "off_2p_ast", "off_2pmid_ast", "off_2prim_ast",

      // Scramble:
      "off_scramble_2p", "off_scramble_2p_ast", "off_scramble_3p", "off_scramble_3p_ast", "off_scramble_2prim", "off_scramble_2prim_ast", "off_scramble_2pmid", 
      "off_scramble_2pmid_ast", "off_scramble_ft", "off_scramble_ftr", "off_scramble_2primr", "off_scramble_2pmidr", "off_scramble_3pr", "off_scramble_assist",

      // Transition:
      "off_trans_2p", "off_trans_2p_ast", "off_trans_3p", "off_trans_3p_ast", "off_trans_2prim", "off_trans_2prim_ast", "off_trans_2pmid", 
      "off_trans_2pmid_ast", "off_trans_ft", "off_trans_ftr", "off_trans_2primr", "off_trans_2pmidr", "off_trans_3pr", "off_trans_assist",

      // Other:
      "off_orb", "def_orb",

      // These need to be created by substitution:
      "def_stl", "def_blk", // (these don't exist: def_stl is def_2prim, def_blk is def_to)
      "def_fc", //(doesn't exist: def_ftr)
   ];

   static fixBoolOps(s: String) { return s.replace(/ AND /g, " && ").replace(/ OR /g, " || ") };
   static fieldReplacements(s: string) { return s.replace("def_blk", "def_2prim").replace("def_stl", "def_to").replace("def_fc", "def_ftr"); }
   static fixObjectFormat(s: string) { 
      return s
         .replace(/((?:off|def)_[0-9a-zA-Z_]+)/g, "$.p.$1.value")
         .replace(/((?:adj)_[0-9a-zA-Z_]+)/g, "$.$1")
         .replace(/roster[.]height/g, "$.normht")
         .replace(/(?:^| )(roster[.][a-z]+|posC[a-z]+|tier|team|conf|year)/g, " $.p.$1")
      ; 
   }
   static avoidAssigmentOperator(s: string) {
      return s.replace(/([^!<>])=[=]*/g, "$1==");
   }
   static normHeightInQuotes(s: string) { return s.replace(/['"]([567])-([0-9])['"]/, "'$1-0$2'"); }
   static normHeightString(s: string) { return s.replace(/^([567])-([0-9])$/, "$1-0$2"); }
   static removeAscDesc(s: string) { return s.replace(/(ASC|DESC)/g, ""); }

   static readonly tidyClauses: (s: string) => string = _.flow([
      AdvancedFilterUtils.fixBoolOps,
      AdvancedFilterUtils.avoidAssigmentOperator,
      AdvancedFilterUtils.fieldReplacements,
      AdvancedFilterUtils.fixObjectFormat,
      AdvancedFilterUtils.normHeightInQuotes,
      AdvancedFilterUtils.removeAscDesc,
      _.trim,
   ]);

   /** Builds a where/orderBy chain by interpreting the string either side of SORT_BY */
   static applyFilter(inData: any[], filterStr: string): [any[], string | undefined] {
      const filterFrags = filterStr.split("SORT_BY");
      const where = AdvancedFilterUtils.tidyClauses(filterFrags[0]);
      
      const sortingFrags = _.drop(filterFrags, 1);

      const sortByFns: Array<EnumToEnum> = sortingFrags.map((sortingFrag, index) => {
         const isAsc = sortingFrag.indexOf("ASC") >= 0;
         const sortBy = AdvancedFilterUtils.tidyClauses(sortingFrag);   

         if (index == 0) {
            return (enumerable: Enumerable.IEnumerable<any>) => {
               return isAsc ? 
                  enumerable.orderBy(sortBy as unknown as TypeScriptWorkaround2) :
                  enumerable.orderByDescending(sortBy as unknown as TypeScriptWorkaround2)
            };
         } else {
            return (enumerable: Enumerable.IEnumerable<any>) => {
               return isAsc ? 
                  (enumerable as Enumerable.IOrderedEnumerable<any>).thenBy(sortBy as unknown as TypeScriptWorkaround2) :
                  (enumerable as Enumerable.IOrderedEnumerable<any>).thenByDescending(sortBy as unknown as TypeScriptWorkaround2)
            };
         }
      });
      
      try {
         const enumData = Enumerable.from(inData.map(p => { 
            return { 
               p: p,
               // Normalize so can do height comparisons 
               normht: AdvancedFilterUtils.normHeightString(p.roster?.height || ""),
               // These need to be derived
               adj_rapm_margin: (p.off_adj_rapm?.value || 0) - (p.def_adj_rapm?.value || 0),
               adj_rtg_margin: (p.off_adj_rtg?.value || 0) - (p.def_adj_rtg?.value || 0),
               adj_rapm_prod_margin: (p.off_adj_rapm?.value || 0)*(p.off_team_poss_pct?.value || 0) - 
                                       (p.def_adj_rapm?.value || 0)*(p.def_team_poss_pct?.value || 0),
               adj_prod_margin: (p.off_adj_rtg?.value || 0)*(p.off_team_poss_pct?.value || 0) - 
                                       (p.def_adj_rtg?.value || 0)*(p.def_team_poss_pct?.value || 0),
               // Already have these but makes the query formatting simpler
               adj_rapm_margin_rank: p.adj_rapm_margin_rank,
               adj_rtg_margin_rank: p.adj_rtg_margin_rank,
               adj_rapm_prod_margin_rank: p.adj_rapm_prod_margin_rank,
               adj_prod_margin_rank: p.adj_prod_margin_rank,
            }; 
         }));
         const filteredData = where.length > 0 ? enumData.where(where as unknown as TypeScriptWorkaround1) : enumData;
         const sortedData = sortByFns.length > 0 ?
            _.flow(sortByFns)(filteredData)
               .thenBy((p: any) => p.p?.baseline?.off_team_poss?.value || 0)
               .thenBy((p: any) => p.p?.key) //(ensure player duplicates follow each other)
            :
            filteredData
            ;

         return [ sortedData.toArray().map((p: any) => p.p), undefined ];
      } catch (e) {
         return [ inData, e.message ];
      }
   }

}