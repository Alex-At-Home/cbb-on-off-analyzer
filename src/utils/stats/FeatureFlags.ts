export class FeatureFlags {
   /** Where possible can be extra safe checking that we're developing on a laptop */
   static isActiveWindow(ff: boolean): boolean {
      if (!ff) {
         return false;
      } else {
         const server = (typeof window === `undefined`) ? //(ensures SSR code still compiles)
            "server" : window.location.hostname
         return (server == "localhost");
      }
   }
   // Feature flags themselves:

   /** Some long term work on showing guesses as to the play types players and teams use */
   static readonly betterStyleAnalysis = false;

   /** For team editor - short term work on generating make-believe NIL estimates - otherwise just a user-editable field */
   static readonly estimateNilValue = true;
}