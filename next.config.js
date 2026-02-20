const { PHASE_DEVELOPMENT_SERVER } = require("next/constants");

const baseConfig = {
  env: {
    GA_KEY: process.env.GA_KEY,
    MEN_CURR_UPDATE: process.env.MEN_CURR_UPDATE,
    WOMEN_CURR_UPDATE: process.env.WOMEN_CURR_UPDATE,
  },
};

module.exports = (phase, { defaultConfig }) => {
  const phaseConfig = {
    ...baseConfig,
  };

  console.log(`phase: ${phase} (${Object.keys(defaultConfig)})`);
  if (phase === PHASE_DEVELOPMENT_SERVER) {
    // Customize the Webpack config during development
    phaseConfig.webpack = (config, { isServer, nextRuntime }) => {
      // From NextJS 13+, isServer appears to always return true, but nextRuntime can be used to determine if the server is nodejs
      // this is client or server (client side it will be edge or browser - server side always nodejs)
      if (isServer && nextRuntime == "nodejs") {
        return {
          ...config,
          entry() {
            return config.entry().then((entry) => {
              return Object.assign({}, entry, {
                buildLeaderboards: "./src/bin/buildLeaderboards.ts",
                buildStrengthAdjustedStats: "./src/bin/buildStrengthAdjustedStats.ts",
              });
            });
          },
        };
      }
      return config;
    };
  }

  return phaseConfig;
};
